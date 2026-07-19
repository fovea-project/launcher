//! Backend connectivity over direct HTTPS (reqwest).
//!
//! The whole point of the app: the webview performs no network I/O. Everything
//! goes through this module, which talks HTTP to the backend's public Cloudflare
//! hostname — the origin server is hidden behind a Cloudflare Tunnel.
//!
//! There is no multi-step bootstrap to wait for, so the app reports "ready"
//! immediately and individual requests surface their own network errors. The
//! status plumbing (the `conn://status` event + `connection_status` command) is
//! kept so the UI keeps a single, uniform readiness gate.

use std::sync::Arc;

use tokio::sync::RwLock;

use crate::config::AppConfig;
use crate::error::{CoreError, Result};
use crate::http::{Request, Response};
use crate::models::{ConnectionPhase, ConnectionStatus};

/// Event channel name the frontend listens on.
pub const CONN_STATUS_EVENT: &str = "conn://status";

pub struct ConnectionManager {
    config: AppConfig,
    status: RwLock<ConnectionStatus>,
}

impl ConnectionManager {
    pub fn new(config: AppConfig) -> Arc<Self> {
        Arc::new(Self {
            config,
            status: RwLock::new(ConnectionStatus::new(ConnectionPhase::Idle, 0.0, "Idle")),
        })
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub async fn status(&self) -> ConnectionStatus {
        self.status.read().await.clone()
    }

    async fn set_status<E: Emit>(&self, emitter: &E, status: ConnectionStatus) {
        *self.status.write().await = status.clone();
        emitter.emit_status(&status);
    }

    /// Mark the connection ready. The direct-HTTPS transport has no multi-step
    /// bootstrap to wait for, so this is immediate; each request reports its own
    /// error if the backend is unreachable.
    pub fn spawn_ready<E: Emit + Send + Sync + 'static>(self: Arc<Self>, emitter: E) {
        tauri::async_runtime::spawn(async move {
            self.set_status(
                &emitter,
                ConnectionStatus::new(ConnectionPhase::Ready, 1.0, "Connected"),
            )
            .await;
        });
    }

    // -----------------------------------------------------------------------
    // Requests
    // -----------------------------------------------------------------------

    /// Perform a JSON request to the backend, attaching the bearer token
    /// automatically when `auth` is set.
    pub async fn request(
        &self,
        method: &str,
        path: &str,
        body: Option<Vec<u8>>,
        auth: Option<String>,
    ) -> Result<Response> {
        let mut headers: Vec<(String, String)> = Vec::new();
        if body.is_some() {
            headers.push(("Content-Type".into(), "application/json".into()));
        }
        if let Some(jwt) = auth {
            headers.push(("Authorization".into(), format!("Bearer {jwt}")));
        }

        let req = Request { method, path, headers, body };
        self.exchange(req).await
    }

    #[cfg(not(feature = "mock-network"))]
    async fn exchange(&self, req: Request<'_>) -> Result<Response> {
        // Direct HTTPS to the backend (origin behind a Cloudflare Tunnel).
        let base = self.config.backend.base_url.trim_end_matches('/');
        let url = format!("{base}{}", req.path);
        let method = reqwest::Method::from_bytes(req.method.as_bytes())
            .map_err(|e| CoreError::Network(format!("bad method: {e}")))?;
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .connect_timeout(std::time::Duration::from_secs(20))
            .user_agent("Fovea/1")
            .build()
            .map_err(|e| CoreError::Network(e.to_string()))?;
        let mut rb = client.request(method, &url);
        for (k, v) in &req.headers {
            rb = rb.header(k.as_str(), v.as_str());
        }
        if let Some(body) = req.body {
            rb = rb.body(body);
        }
        let resp = rb
            .send()
            .await
            .map_err(|e| CoreError::Network(e.to_string()))?;
        let status = resp.status().as_u16();
        let headers = resp
            .headers()
            .iter()
            .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let body = resp
            .bytes()
            .await
            .map_err(|e| CoreError::Network(e.to_string()))?
            .to_vec();
        Ok(Response { status, headers, body })
    }

    #[cfg(feature = "mock-network")]
    async fn exchange(&self, _req: Request<'_>) -> Result<Response> {
        // The command layer short-circuits to mock data before reaching here in
        // mock-network builds, so this is never actually called.
        Err(CoreError::Network("mock-network: real exchange disabled".into()))
    }
}

/// Abstraction over "something that can push a connection status to the
/// frontend", so `ConnectionManager` does not depend on Tauri's concrete
/// `AppHandle` type.
pub trait Emit {
    fn emit_status(&self, status: &ConnectionStatus);
}

/// Tauri-backed emitter: forwards each status onto the `conn://status` event.
#[derive(Clone)]
pub struct TauriEmitter {
    pub app: tauri::AppHandle,
}

impl Emit for TauriEmitter {
    fn emit_status(&self, status: &ConnectionStatus) {
        use tauri::Emitter;
        let _ = self.app.emit(CONN_STATUS_EVENT, status.clone());
    }
}
