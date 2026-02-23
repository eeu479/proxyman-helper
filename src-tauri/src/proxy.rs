use crate::response::{header_map_to_string_map, json_error_response};
use crate::state::AppState;
use crate::types::{Profile, Store};
use axum::{
    body::Body,
    http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, Uri},
    response::Response,
};
use axum::body::Bytes;

pub async fn proxy_request(
    state: &AppState,
    store: &Store,
    active_profile: Option<&str>,
    method: &Method,
    uri: Uri,
    headers: HeaderMap,
    body: Bytes,
) -> (Response, crate::state::LoggedResponse) {
    let profile = resolve_active_profile(store, active_profile);
    let Some(profile) = profile else {
        let (response, logged_response) = json_error_response(
            StatusCode::NOT_FOUND,
            "No active profile available for proxying".to_string(),
        );
        return (response, logged_response);
    };

    if profile.base_url.trim().is_empty() {
        let (response, logged_response) = json_error_response(
            StatusCode::BAD_REQUEST,
            "Active profile does not define a baseUrl".to_string(),
        );
        return (response, logged_response);
    }

    let url = build_proxy_url(&profile.base_url, &uri);
    let upstream_method =
        reqwest::Method::from_bytes(method.as_str().as_bytes()).unwrap_or(reqwest::Method::GET);
    let proxy_headers = build_proxy_request_headers(&headers);

    let upstream = state
        .http_client
        .request(upstream_method, url)
        .headers(proxy_headers)
        .body(body)
        .send()
        .await;

    let upstream = match upstream {
        Ok(response) => response,
        Err(error) => {
            return json_error_response(
                StatusCode::BAD_GATEWAY,
                format!("Proxy request failed: {error}"),
            );
        }
    };

    let status =
        StatusCode::from_u16(upstream.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let response_headers = filter_proxy_response_headers(upstream.headers());
    let body_bytes = match upstream.bytes().await {
        Ok(bytes) => bytes,
        Err(error) => {
            return json_error_response(
                StatusCode::BAD_GATEWAY,
                format!("Unable to read proxy response: {error}"),
            );
        }
    };

    let body_text = String::from_utf8_lossy(&body_bytes).to_string();
    let mut response = Response::new(Body::from(body_bytes));
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;
    let logged_response = crate::state::LoggedResponse {
        status: Some(status.as_u16()),
        headers: header_map_to_string_map(response.headers()),
        body: Some(body_text),
    };

    (response, logged_response)
}

pub fn resolve_active_profile(store: &Store, active_profile: Option<&str>) -> Option<Profile> {
    if let Some(name) = active_profile {
        if let Some(profile) = store.profiles.iter().find(|profile| profile.name == name) {
            return Some(profile.clone());
        }
    }
    store.profiles.first().cloned()
}

fn build_proxy_url(base_url: &str, uri: &Uri) -> String {
    let base = base_url.trim_end_matches('/');
    let path = uri.path();
    let mut full = if path.starts_with('/') {
        format!("{}{}", base, path)
    } else {
        format!("{}/{}", base, path)
    };
    if let Some(query) = uri.query() {
        full.push('?');
        full.push_str(query);
    }
    full
}

fn build_proxy_request_headers(headers: &HeaderMap) -> HeaderMap {
    let mut next = HeaderMap::new();
    for (name, value) in headers.iter() {
        let key = name.as_str().to_ascii_lowercase();
        if matches!(
            key.as_str(),
            "host"
                | "content-length"
                | "connection"
                | "keep-alive"
                | "proxy-authenticate"
                | "proxy-authorization"
                | "te"
                | "trailers"
                | "transfer-encoding"
                | "upgrade"
        ) {
            continue;
        }
        next.append(name.clone(), value.clone());
    }

    next.insert(
        HeaderName::from_bytes(b"x-bypass-proxyman").unwrap(),
        HeaderValue::from_static("true"),
    );
    next
}

fn filter_proxy_response_headers(headers: &HeaderMap) -> HeaderMap {
    let mut next = HeaderMap::new();
    for (name, value) in headers.iter() {
        let key = name.as_str().to_ascii_lowercase();
        if matches!(
            key.as_str(),
            "connection"
                | "keep-alive"
                | "proxy-authenticate"
                | "proxy-authorization"
                | "te"
                | "trailers"
                | "transfer-encoding"
                | "upgrade"
        ) {
            continue;
        }
        next.append(name.clone(), value.clone());
    }
    next
}
