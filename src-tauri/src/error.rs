//! Unified error type. Commands convert this to a `String` for the IPC boundary
//! so the frontend gets a readable message instead of an opaque failure.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("configuration error: {0}")]
    Config(String),

    #[error("network error: {0}")]
    Network(String),

    #[error("backend returned HTTP {status}: {body}")]
    Http { status: u16, body: String },

    #[error("{0}")]
    Banned(String),

    #[error("not authenticated")]
    Unauthorized,

    #[error("secure storage error: {0}")]
    Storage(String),

    #[error("decode error: {0}")]
    Decode(String),
}

pub type Result<T> = std::result::Result<T, CoreError>;

impl From<CoreError> for String {
    fn from(e: CoreError) -> Self {
        e.to_string()
    }
}

impl From<serde_json::Error> for CoreError {
    fn from(e: serde_json::Error) -> Self {
        CoreError::Decode(e.to_string())
    }
}
