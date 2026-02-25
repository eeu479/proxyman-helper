use crate::state::{AppState, LoggedResponse, MatchKey, RequestLogEntry, MAX_LOG_ENTRIES};
use crate::types::{BlockMatch, MatchResult};
use axum::http::Method;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn record_request(
    state: &AppState,
    method: &Method,
    path: &str,
    query: &HashMap<String, String>,
    match_result: Option<&MatchResult>,
    block_match: Option<&BlockMatch>,
    response: Option<LoggedResponse>,
) {
    let timestamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or_default();

    let (profile, sub_profile, request, block, matched) = match (match_result, block_match) {
        (Some(found), _) => (
            Some(found.profile.name.clone()),
            Some(found.sub_profile.name.clone()),
            Some(found.request.name.clone()),
            None,
            true,
        ),
        (None, Some(found)) => (
            Some(found.profile.name.clone()),
            None,
            None,
            Some(found.block.name.clone()),
            true,
        ),
        _ => (None, None, None, None, false),
    };

    let entry = RequestLogEntry {
        timestamp_ms,
        method: method.as_str().to_string(),
        path: path.to_string(),
        query: query.clone(),
        matched,
        profile: profile.clone(),
        sub_profile,
        request: request.clone(),
        block,
        response,
    };

    let mut log_store = state.log_store.lock().await;
    log_store.entries.push_back(entry);
    if log_store.entries.len() > MAX_LOG_ENTRIES {
        log_store.entries.pop_front();
    }

    if let (Some(profile), Some(request)) = (profile, request) {
        let key = MatchKey { profile, request };
        *log_store.counts.entry(key).or_insert(0) += 1;
    }
}
