//! Runtime configuration. The backend base URL is never hard-coded — it is read
//! from `r00tshop.toml` so the same binary can point at different backends and
//! so deployment details stay out of the source tree.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::{CoreError, Result};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppConfig {
    pub backend: BackendConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BackendConfig {
    #[serde(default = "default_api_base")]
    pub api_base: String,
    /// Base URL of the backend over HTTPS. The origin is hidden behind a
    /// Cloudflare Tunnel, so this is the public Cloudflare hostname — no trailing
    /// slash and no path, e.g. "https://shop.fovea-project.com".
    #[serde(default = "default_base_url")]
    pub base_url: String,
}

fn default_api_base() -> String {
    "/api".to_string()
}
fn default_base_url() -> String {
    "https://shop.fovea-project.com".to_string()
}

impl AppConfig {
    /// Resolve the config file location and load it. Search order:
    /// 1. `$R00TSHOP_CONFIG` (absolute path)
    /// 2. `r00tshop.toml` next to the executable
    /// 3. `r00tshop.toml` in the current working directory
    pub fn load() -> Result<Self> {
        match Self::resolve_existing_path() {
            Some(path) => {
                let raw = std::fs::read_to_string(&path).map_err(|e| {
                    CoreError::Config(format!("could not read config at {}: {e}", path.display()))
                })?;
                let cfg: AppConfig = toml::from_str(&raw)
                    .map_err(|e| CoreError::Config(format!("invalid TOML: {e}")))?;
                cfg.validate()?;
                Ok(cfg)
            }
            // No config file anywhere — fall back to the baked-in defaults so a
            // distributed build connects out of the box. Override by dropping a
            // r00tshop.toml next to the executable or setting $R00TSHOP_CONFIG.
            None => Ok(Self::baked_default()),
        }
    }

    fn resolve_existing_path() -> Option<PathBuf> {
        if let Ok(p) = std::env::var("R00TSHOP_CONFIG") {
            let pb = PathBuf::from(p);
            if pb.exists() {
                return Some(pb);
            }
        }
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                let candidate = dir.join("r00tshop.toml");
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
        let cwd = PathBuf::from("r00tshop.toml");
        if cwd.exists() {
            return Some(cwd);
        }
        None
    }

    /// Built-in default pointing at the live Fovea backend. Used when no config
    /// file is present (e.g. an installed build on a friend's machine).
    fn baked_default() -> Self {
        AppConfig {
            backend: BackendConfig {
                api_base: default_api_base(),
                base_url: default_base_url(),
            },
        }
    }

    fn validate(&self) -> Result<()> {
        // Direct-HTTPS transport: require a usable base_url.
        let base = self.backend.base_url.trim();
        if !(base.starts_with("http://") || base.starts_with("https://")) {
            return Err(CoreError::Config(format!(
                "backend.base_url must start with http(s)://: {base:?}"
            )));
        }
        Ok(())
    }

    /// e.g. "/api/products"
    pub fn api_path(&self, suffix: &str) -> String {
        let base = self.backend.api_base.trim_end_matches('/');
        format!("{base}/{}", suffix.trim_start_matches('/'))
    }
}
