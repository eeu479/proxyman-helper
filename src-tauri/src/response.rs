use crate::state::LoggedResponse;
use crate::template::{merged_template_values, normalize_json_quotes, render_template};
use crate::types::{BlockMatch, MatchResult};
use axum::{
    body::Body,
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};
use std::collections::HashMap;

pub fn build_response(
    match_result: &MatchResult,
    path: &str,
    query: &HashMap<String, String>,
) -> (Response, LoggedResponse) {
    let response_config = match_result.request.response.clone().unwrap_or_default();
    let status = response_config
        .status
        .and_then(|value| StatusCode::from_u16(value).ok())
        .unwrap_or(StatusCode::OK);

    let body = response_config.body.unwrap_or_else(|| {
        json!({
          "matched": {
            "profile": match_result.profile.name,
            "subProfile": match_result.sub_profile.name,
            "request": match_result.request.name
          },
          "path": path,
          "query": query,
          "params": match_result.extracted_params
        })
    });

    let response_headers = response_config.headers.clone();
    let body_for_log = serde_json::to_string_pretty(&body).ok();
    let mut response = Json(body).into_response();
    *response.status_mut() = status;

    for (key, value) in response_headers.iter() {
        if let Ok(header_name) = HeaderName::from_bytes(key.as_bytes()) {
            if let Ok(header_value) = value.parse() {
                response.headers_mut().insert(header_name, header_value);
            }
        }
    }

    let logged_response = LoggedResponse {
        status: Some(status.as_u16()),
        headers: response_headers,
        body: body_for_log,
    };

    (response, logged_response)
}

pub fn build_block_response(block_match: &BlockMatch) -> (Response, LoggedResponse) {
    let template_values = merged_template_values(block_match);
    let rendered = render_template(&block_match.block.response_template, &template_values);
    let normalized = normalize_json_quotes(&rendered);

    let parsed_json = if rendered.trim().is_empty() {
        None
    } else if let Ok(value) = serde_json::from_str::<Value>(&rendered) {
        Some(value)
    } else {
        serde_json::from_str::<Value>(&normalized).ok()
    };

    let mut response = if rendered.trim().is_empty() {
        StatusCode::OK.into_response()
    } else if let Some(value) = parsed_json.clone() {
        Json(value).into_response()
    } else {
        let mut response = Response::new(Body::from(normalized.clone()));
        if let Ok(header_value) = HeaderValue::from_str("text/plain; charset=utf-8") {
            response
                .headers_mut()
                .insert(HeaderName::from_static("content-type"), header_value);
        }
        response
    };

    let mut rendered_headers = HashMap::new();
    for (key, value) in block_match.block.response_headers.iter() {
        let trimmed = key.trim();
        if trimmed.is_empty() {
            continue;
        }
        let rendered_value = render_template(value, &template_values);
        if let Ok(header_name) = HeaderName::from_bytes(trimmed.as_bytes()) {
            if let Ok(header_value) = HeaderValue::from_str(&rendered_value) {
                response.headers_mut().insert(header_name, header_value);
                rendered_headers.insert(trimmed.to_string(), rendered_value);
            }
        }
    }

    let body = if rendered.trim().is_empty() {
        None
    } else if let Some(value) = parsed_json {
        serde_json::to_string_pretty(&value).ok()
    } else {
        Some(normalized)
    };

    let logged_response = LoggedResponse {
        status: Some(StatusCode::OK.as_u16()),
        headers: rendered_headers,
        body,
    };

    (response, logged_response)
}

pub fn header_map_to_string_map(headers: &HeaderMap) -> HashMap<String, String> {
    let mut next = HashMap::new();
    for (name, value) in headers.iter() {
        if let Ok(value) = value.to_str() {
            next.insert(name.to_string(), value.to_string());
        }
    }
    next
}

pub fn json_error_response(status: StatusCode, message: String) -> (Response, LoggedResponse) {
    let body = json!({ "error": message });
    let mut response = Json(body.clone()).into_response();
    *response.status_mut() = status;
    let logged_response = LoggedResponse {
        status: Some(status.as_u16()),
        headers: header_map_to_string_map(response.headers()),
        body: serde_json::to_string_pretty(&body).ok(),
    };
    (response, logged_response)
}
