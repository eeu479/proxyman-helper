use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct AppState {
    pub data_file: Arc<PathBuf>,
    pub write_lock: Arc<Mutex<()>>,
    pub log_store: Arc<Mutex<LogStore>>,
    pub active_profile: Arc<Mutex<Option<String>>>,
    pub http_client: reqwest::Client,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequestLogEntry {
    pub timestamp_ms: u128,
    pub method: String,
    pub path: String,
    pub query: HashMap<String, String>,
    pub matched: bool,
    pub profile: Option<String>,
    pub sub_profile: Option<String>,
    pub request: Option<String>,
    pub block: Option<String>,
    pub response: Option<LoggedResponse>,
}

#[derive(Debug, Hash, Eq, PartialEq, Clone)]
pub struct MatchKey {
    pub profile: String,
    pub request: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestMatchCount {
    pub profile: String,
    pub request: String,
    pub count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LoggedResponse {
    #[serde(default)]
    pub status: Option<u16>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: Option<String>,
}

#[derive(Debug, Default)]
pub struct LogStore {
    pub entries: VecDeque<RequestLogEntry>,
    pub counts: HashMap<MatchKey, u64>,
}

pub const MAX_LOG_ENTRIES: usize = 500;
