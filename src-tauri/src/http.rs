//! Request/response value types shared across the core.
//!
//! The actual HTTP exchange is performed by `reqwest` in `connection.rs`; these
//! are just the small, transport-agnostic shapes the command layer builds and
//! reads.

pub struct Request<'a> {
    pub method: &'a str,
    pub path: &'a str,
    /// (name, value) header pairs.
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
}

pub struct Response {
    pub status: u16,
    /// Response headers (kept for callers that need to inspect them, e.g.
    /// content-type or a download filename hint).
    #[allow(dead_code)]
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl Response {
    pub fn text(&self) -> String {
        String::from_utf8_lossy(&self.body).into_owned()
    }
    pub fn is_success(&self) -> bool {
        (200..300).contains(&self.status)
    }
}
