//! Secure session storage. The JWT is a bearer credential, so it lives in the OS
//! keychain (Windows Credential Manager / macOS Keychain / Secret Service) via
//! the `keyring` crate — never in plaintext on disk and never exposed to the
//! webview.

use crate::error::{CoreError, Result};
use crate::models::AuthSession;

const SERVICE: &str = "shop.r00t.launcher";
const ACCOUNT: &str = "session";

fn entry() -> Result<keyring::Entry> {
    keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| CoreError::Storage(e.to_string()))
}

/// Persist the session (JWT + email + expiry) as a JSON blob in the keychain.
pub fn save_session(session: &AuthSession) -> Result<()> {
    let blob = serde_json::to_string(session)?;
    entry()?
        .set_password(&blob)
        .map_err(|e| CoreError::Storage(e.to_string()))
}

/// Load the persisted session, if present and still valid.
pub fn load_session() -> Result<Option<AuthSession>> {
    let e = entry()?;
    match e.get_password() {
        Ok(blob) => {
            let session: AuthSession = serde_json::from_str(&blob)?;
            // Drop sessions that are clearly expired (best-effort; the backend is
            // the real authority and will 401 anyway).
            let now = now_secs();
            if session.expires_at != 0 && session.expires_at < now {
                let _ = clear_session();
                return Ok(None);
            }
            Ok(Some(session))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(CoreError::Storage(e.to_string())),
    }
}

/// Return just the bearer token for the `Authorization` header.
pub fn current_jwt() -> Result<Option<String>> {
    Ok(load_session()?.map(|s| s.jwt))
}

pub fn clear_session() -> Result<()> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(CoreError::Storage(e.to_string())),
    }
}

fn now_secs() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
