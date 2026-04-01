use crate::blocks;
use crate::logs;
use crate::matching;
use crate::response;
use crate::proxy;
use crate::state::{AppState, RequestLogEntry, RequestMatchCount};
use crate::store;
use crate::system_proxy;
use crate::types::{
    ActiveProfileResponse, AddLibraryInput, Block, BlocksPayload, CreateProfileInput,
    CreateRequestInput, CreateSubProfileInput, Library, Profile, SetActiveProfileInput,
    SubProfile, UpdateLibraryInput, UpdateProfileInput, UpdateSubProfileInput,
};
use axum::{
    extract::{Path as AxumPath, Query, State},
    http::{HeaderMap, Method, StatusCode, Uri},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::Path;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn health() -> Json<Value> {
    Json(json!({ "ok": true }))
}

pub async fn list_profiles(State(state): State<AppState>) -> Json<Vec<Profile>> {
    let store = store::read_store(&state).await;
    Json(store.profiles)
}

pub async fn get_logs(State(state): State<AppState>) -> Json<Vec<RequestLogEntry>> {
    let log_store = state.log_store.lock().await;
    Json(log_store.entries.iter().cloned().collect())
}

pub async fn get_request_counts(State(state): State<AppState>) -> Json<Vec<RequestMatchCount>> {
    let log_store = state.log_store.lock().await;
    let payload = log_store
        .counts
        .iter()
        .map(|(key, count)| RequestMatchCount {
            profile: key.profile.clone(),
            request: key.request.clone(),
            count: *count,
        })
        .collect();
    Json(payload)
}

pub async fn get_profile(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
) -> Response {
    let store = store::read_store(&state).await;
    match store
        .profiles
        .into_iter()
        .find(|profile| profile.name == profile_name)
    {
        Some(profile) => Json(profile).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response(),
    }
}

pub async fn create_profile(
    State(state): State<AppState>,
    Json(input): Json<CreateProfileInput>,
) -> Response {
    let mut store = store::read_store(&state).await;
    if store
        .profiles
        .iter()
        .any(|profile| profile.name == input.name)
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "error": "Profile already exists" })),
        )
            .into_response();
    }

    let profile = Profile {
        name: input.name.clone(),
        base_url: input.base_url.unwrap_or_default(),
        params: input.params.unwrap_or_default(),
        sub_profiles: Vec::new(),
        requests: Vec::new(),
        library_blocks: Vec::new(),
        active_blocks: Vec::new(),
        categories: Vec::new(),
        libraries: vec![Library {
            id: "local".to_string(),
            name: "Local".to_string(),
            lib_type: "local".to_string(),
            folder_path: None,
        }],
    };
    store.profiles.push(profile.clone());

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    (StatusCode::CREATED, Json(profile)).into_response()
}

pub async fn update_profile(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
    Json(input): Json<UpdateProfileInput>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let active_profile = state.active_profile.lock().await.clone();
    if let Some(next_name) = input.name.clone() {
        if next_name.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Profile name cannot be empty" })),
            )
                .into_response();
        }

        if next_name != profile_name && store.profiles.iter().any(|item| item.name == next_name) {
            return (
                StatusCode::CONFLICT,
                Json(json!({ "error": "Profile already exists" })),
            )
                .into_response();
        }
    }

    let updated_profile = {
        let Some(profile) = store
            .profiles
            .iter_mut()
            .find(|profile| profile.name == profile_name)
        else {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Profile not found" })),
            )
                .into_response();
        };

        if let Some(next_name) = input.name {
            profile.name = next_name;
        }

        if let Some(base_url) = input.base_url {
            profile.base_url = base_url;
        }

        if let Some(params) = input.params {
            profile.params = params;
        }

        profile.clone()
    };

    if active_profile.as_deref() == Some(profile_name.as_str()) {
        store.active_profile = Some(updated_profile.name.clone());
        *state.active_profile.lock().await = Some(updated_profile.name.clone());
    }

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    Json(updated_profile).into_response()
}

pub async fn delete_profile(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let initial_len = store.profiles.len();
    let was_active = state.active_profile.lock().await.as_deref() == Some(profile_name.as_str());
    store.profiles.retain(|p| p.name != profile_name);
    if store.profiles.len() == initial_len {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    }
    if was_active {
        let next_active = store.profiles.first().map(|p| p.name.clone());
        store.active_profile = next_active.clone();
        *state.active_profile.lock().await = next_active;
    }
    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }
    (StatusCode::NO_CONTENT, ()).into_response()
}

pub async fn create_sub_profile(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
    Json(input): Json<CreateSubProfileInput>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let Some(profile) = store
        .profiles
        .iter_mut()
        .find(|profile| profile.name == profile_name)
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };

    if profile
        .sub_profiles
        .iter()
        .any(|sub| sub.name == input.name)
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "error": "SubProfile already exists" })),
        )
            .into_response();
    }

    let sub_profile = SubProfile {
        name: input.name,
        params: input.params.unwrap_or_default(),
    };
    profile.sub_profiles.push(sub_profile.clone());

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    (StatusCode::CREATED, Json(sub_profile)).into_response()
}

pub async fn update_sub_profile(
    State(state): State<AppState>,
    AxumPath((profile_name, subprofile_name)): AxumPath<(String, String)>,
    Json(input): Json<UpdateSubProfileInput>,
) -> Response {
    let mut store = store::read_store(&state).await;

    let Some(profile) = store
        .profiles
        .iter()
        .find(|profile| profile.name == profile_name)
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };

    if let Some(next_name) = input.name.clone() {
        if next_name.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "SubProfile name cannot be empty" })),
            )
                .into_response();
        }

        if next_name != subprofile_name
            && profile.sub_profiles.iter().any(|sub| sub.name == next_name)
        {
            return (
                StatusCode::CONFLICT,
                Json(json!({ "error": "SubProfile already exists" })),
            )
                .into_response();
        }
    }

    let updated_subprofile = {
        let Some(profile) = store
            .profiles
            .iter_mut()
            .find(|profile| profile.name == profile_name)
        else {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Profile not found" })),
            )
                .into_response();
        };

        let Some(sub_profile) = profile
            .sub_profiles
            .iter_mut()
            .find(|sub| sub.name == subprofile_name)
        else {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "SubProfile not found" })),
            )
                .into_response();
        };

        if let Some(next_name) = input.name {
            sub_profile.name = next_name;
        }

        if let Some(params) = input.params {
            sub_profile.params = params;
        }

        sub_profile.clone()
    };

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    Json(updated_subprofile).into_response()
}

pub async fn delete_sub_profile(
    State(state): State<AppState>,
    AxumPath((profile_name, subprofile_name)): AxumPath<(String, String)>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let Some(profile) = store
        .profiles
        .iter_mut()
        .find(|profile| profile.name == profile_name)
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };

    let initial_len = profile.sub_profiles.len();
    profile
        .sub_profiles
        .retain(|sub| sub.name != subprofile_name);

    if profile.sub_profiles.len() == initial_len {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "SubProfile not found" })),
        )
            .into_response();
    }

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    StatusCode::NO_CONTENT.into_response()
}

pub async fn create_request(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
    Json(input): Json<CreateRequestInput>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let Some(profile) = store
        .profiles
        .iter_mut()
        .find(|profile| profile.name == profile_name)
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };

    if profile
        .requests
        .iter()
        .any(|request| request.name == input.name)
    {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "error": "Request already exists" })),
        )
            .into_response();
    }

    let request = crate::types::RequestConfig {
        name: input.name,
        method: input
            .method
            .unwrap_or_else(|| "GET".to_string())
            .to_uppercase(),
        path: input.path,
        query_parameters: input.query_parameters.unwrap_or_default(),
        headers: input.headers.unwrap_or_default(),
        body: input.body.unwrap_or_default(),
        params: input.params.unwrap_or_default(),
        response: input.response,
    };
    profile.requests.push(request.clone());

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    (StatusCode::CREATED, Json(request)).into_response()
}

pub async fn get_libraries(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
) -> Response {
    let store = store::read_store(&state).await;
    let Some(profile) = store.profiles.iter().find(|p| p.name == profile_name) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };
    Json(profile.libraries.clone()).into_response()
}

pub async fn add_library(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
    Json(input): Json<AddLibraryInput>,
) -> Response {
    if input.lib_type != "remote" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Only remote (folder) libraries are supported for add" })),
        )
            .into_response();
    }
    let Some(folder_path) = &input.folder_path else {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "folderPath is required for remote library" })),
        )
            .into_response();
    };
    let folder_path = folder_path.trim();
    if folder_path.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "folderPath cannot be empty" })),
        )
            .into_response();
    }
    let path_buf = PathBuf::from(folder_path);
    let canonical = match tokio::fs::canonicalize(&path_buf).await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": format!("Path does not exist or is not accessible: {}", e) })),
            )
                .into_response();
        }
    };
    let meta = match tokio::fs::metadata(&canonical).await {
        Ok(m) => m,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": e.to_string() })),
            )
                .into_response();
        }
    };
    if !meta.is_dir() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Path is not a directory" })),
        )
            .into_response();
    }
    let blocks_dir = canonical.join("blocks");
    if let Err(e) = tokio::fs::create_dir_all(&blocks_dir).await {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": format!("Could not create blocks folder: {}", e) })),
        )
            .into_response();
    }
    let lib_id = format!(
        "folder-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );
    let folder_path_str = canonical.to_string_lossy().to_string();
    let new_lib = Library {
        id: lib_id.clone(),
        name: input.name.clone(),
        lib_type: "remote".to_string(),
        folder_path: Some(folder_path_str),
    };
    let mut store = store::read_store(&state).await;
    let Some(profile) = store.profiles.iter_mut().find(|p| p.name == profile_name) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };
    profile.libraries.push(new_lib.clone());
    if let Err(e) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e })),
        )
            .into_response();
    }
    (StatusCode::CREATED, Json(new_lib)).into_response()
}

pub async fn update_library(
    State(state): State<AppState>,
    AxumPath((profile_name, lib_id)): AxumPath<(String, String)>,
    Json(input): Json<UpdateLibraryInput>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let Some(profile) = store.profiles.iter_mut().find(|p| p.name == profile_name) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };
    let Some(lib) = profile.libraries.iter_mut().find(|l| l.id == lib_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Library not found" })),
        )
            .into_response();
    };
    if let Some(name) = input.name {
        lib.name = name;
    }
    let lib_clone = lib.clone();
    if let Err(e) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e })),
        )
            .into_response();
    }
    Json(lib_clone).into_response()
}

pub async fn delete_library(
    State(state): State<AppState>,
    AxumPath((profile_name, lib_id)): AxumPath<(String, String)>,
) -> Response {
    if lib_id == "local" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Cannot delete local library" })),
        )
            .into_response();
    }
    let mut store = store::read_store(&state).await;
    let Some(profile) = store.profiles.iter_mut().find(|p| p.name == profile_name) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };
    profile.libraries.retain(|l| l.id != lib_id);
    if let Err(e) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e })),
        )
            .into_response();
    }
    (StatusCode::NO_CONTENT, ()).into_response()
}

pub async fn get_blocks(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
) -> Response {
    let store = store::read_store(&state).await;
    let Some(profile) = store
        .profiles
        .into_iter()
        .find(|profile| profile.name == profile_name)
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };

    let mut library_blocks: Vec<Block> = Vec::new();
    for block in profile.library_blocks {
        let mut b = block;
        if b.source_library_id.is_none() {
            b.source_library_id = Some("local".to_string());
        }
        library_blocks.push(b);
    }

    for lib in &profile.libraries {
        if lib.lib_type == "remote" {
            if let Some(ref folder_path) = lib.folder_path {
                let path = Path::new(folder_path);
                let blocks = blocks::read_blocks_from_path(path, &lib.id).await;
                library_blocks.extend(blocks);
            }
        }
    }

    Json(BlocksPayload {
        library_blocks,
        active_blocks: profile.active_blocks,
        categories: profile.categories,
    })
    .into_response()
}

pub async fn update_blocks(
    State(state): State<AppState>,
    AxumPath(profile_name): AxumPath<String>,
    Json(input): Json<BlocksPayload>,
) -> Response {
    let mut store = store::read_store(&state).await;
    let Some(profile) = store
        .profiles
        .iter_mut()
        .find(|profile| profile.name == profile_name)
    else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    };

    let local_blocks: Vec<Block> = input
        .library_blocks
        .iter()
        .filter(|b| {
            b.source_library_id
                .as_deref()
                .map(|id| id == "local")
                .unwrap_or(true)
        })
        .cloned()
        .collect();

    let mut blocks_by_remote: HashMap<String, Vec<Block>> = HashMap::new();
    for block in &input.library_blocks {
        if let Some(ref sid) = block.source_library_id {
            if *sid != "local" {
                blocks_by_remote
                    .entry(sid.clone())
                    .or_default()
                    .push(block.clone());
            }
        }
    }

    for lib in &profile.libraries {
        if lib.lib_type == "remote" {
            if let Some(ref folder_path) = lib.folder_path {
                let path = Path::new(folder_path);
                let blocks = blocks_by_remote.get(&lib.id).cloned().unwrap_or_default();
                if let Err(e) = blocks::write_blocks_to_path(path, &blocks).await {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({ "error": e })),
                    )
                        .into_response();
                }
            }
        }
    }

    profile.library_blocks = local_blocks;
    profile.active_blocks = input.active_blocks.clone();
    profile.categories = input.categories.clone();

    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }

    Json(BlocksPayload {
        library_blocks: input.library_blocks,
        active_blocks: input.active_blocks,
        categories: input.categories,
    })
    .into_response()
}

pub async fn get_active_profile(State(state): State<AppState>) -> Json<ActiveProfileResponse> {
    let active_profile = state.active_profile.lock().await.clone();
    Json(ActiveProfileResponse {
        name: active_profile,
    })
}

pub async fn set_active_profile(
    State(state): State<AppState>,
    Json(input): Json<SetActiveProfileInput>,
) -> Response {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Profile name cannot be empty" })),
        )
            .into_response();
    }

    let mut store = store::read_store(&state).await;
    if !store.profiles.iter().any(|profile| profile.name == name) {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Profile not found" })),
        )
            .into_response();
    }

    *state.active_profile.lock().await = Some(name.clone());
    store.active_profile = Some(name.clone());
    if let Err(error) = store::write_store(&state, &store).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": error })),
        )
            .into_response();
    }
    Json(ActiveProfileResponse { name: Some(name) }).into_response()
}

pub async fn proxy_handler(
    State(state): State<AppState>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    body: axum::body::Bytes,
) -> Response {
    let store = store::read_store(&state).await;
    let path = uri.path().to_string();
    let active_profile = state.active_profile.lock().await.clone();
    let block_match = matching::find_block_match(&store, active_profile.as_deref(), &method, &path);
    if let Some(found) = block_match.as_ref() {
        let (response, logged_response) = response::build_block_response(found);
        logs::record_request(
            &state,
            &method,
            &path,
            &query,
            None,
            Some(found),
            Some(logged_response),
            None,
            None,
        )
        .await;
        return response;
    }
    let match_result = matching::find_match(
        &store,
        &method,
        &path,
        &headers,
        &query,
        active_profile.as_deref(),
    );
    match match_result {
        Some(found) => {
            let (response, logged_response) = response::build_response(&found, &path, &query);
            logs::record_request(
                &state,
                &method,
                &path,
                &query,
                Some(&found),
                None,
                Some(logged_response),
                None,
                None,
            )
            .await;
            response
        }
        None => {
            let (response, logged_response) = proxy::proxy_request(
                &state,
                &store,
                active_profile.as_deref(),
                &method,
                uri,
                headers,
                body,
            )
            .await;
            logs::record_request(
                &state,
                &method,
                &path,
                &query,
                None,
                None,
                Some(logged_response),
                None,
                None,
            )
            .await;
            response
        }
    }
}

// --- Proxy management handlers ---

fn configured_proxy_port() -> u16 {
    std::env::var("MAPY_PROXY_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(9090)
}

fn configured_api_port() -> u16 {
    std::env::var("MAPY_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(3000)
}

pub async fn proxy_status(State(_state): State<AppState>) -> Json<Value> {
    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    let proxy_port = configured_proxy_port();
    let api_port = configured_api_port();

    Json(json!({
        "enabled": true,
        "port": proxy_port,
        "localIp": local_ip,
        "apiPort": api_port,
    }))
}

pub async fn proxy_ca_pem(State(state): State<AppState>) -> Response {
    let cert_pem = state.ca_cert_pem.as_str();
    (
        StatusCode::OK,
        [
            (
                axum::http::header::CONTENT_TYPE,
                "application/x-pem-file",
            ),
            (
                axum::http::header::CONTENT_DISPOSITION,
                "attachment; filename=\"mapy_ca.pem\"",
            ),
        ],
        cert_pem.to_string(),
    )
        .into_response()
}

pub async fn proxy_ca_mobileconfig(State(state): State<AppState>) -> Response {
    let cert_pem = state.ca_cert_pem.as_str();

    // Extract the base64 content between BEGIN/END markers
    let cert_der_b64 = cert_pem
        .lines()
        .filter(|l| !l.starts_with("-----"))
        .collect::<Vec<_>>()
        .join("");

    let mobileconfig = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadCertificateFileName</key>
            <string>mapy_ca.cer</string>
            <key>PayloadContent</key>
            <data>{cert_der_b64}</data>
            <key>PayloadDescription</key>
            <string>Adds a CA root certificate for Mapy HTTPS proxy</string>
            <key>PayloadDisplayName</key>
            <string>Mapy Proxy CA</string>
            <key>PayloadIdentifier</key>
            <string>com.mapy.proxy.ca</string>
            <key>PayloadType</key>
            <string>com.apple.security.root</string>
            <key>PayloadUUID</key>
            <string>A1B2C3D4-E5F6-7890-ABCD-EF1234567890</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Mapy Proxy CA</string>
    <key>PayloadIdentifier</key>
    <string>com.mapy.proxy.profile</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>B2C3D4E5-F6A7-8901-BCDE-F12345678901</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>"#
    );

    (
        StatusCode::OK,
        [
            (
                axum::http::header::CONTENT_TYPE,
                "application/x-apple-aspen-config",
            ),
            (
                axum::http::header::CONTENT_DISPOSITION,
                "attachment; filename=\"mapy_ca.mobileconfig\"",
            ),
        ],
        mobileconfig,
    )
        .into_response()
}

pub async fn proxy_install_simulator(State(state): State<AppState>) -> Response {
    let cert_path = state.data_dir.join("mapy_ca_cert.pem");
    let cert_path_str = cert_path.to_string_lossy().to_string();

    let output = tokio::process::Command::new("xcrun")
        .args(["simctl", "keychain", "booted", "add-root-cert", &cert_path_str])
        .output()
        .await;

    match output {
        Ok(result) => {
            if result.status.success() {
                Json(json!({ "ok": true, "message": "Certificate installed on booted simulator" }))
                    .into_response()
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr).to_string();
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "ok": false, "error": stderr })),
                )
                    .into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": format!("Failed to run xcrun: {e}") })),
        )
            .into_response(),
    }
}

pub async fn proxy_install_macos(State(state): State<AppState>) -> Response {
    let cert_path = state.data_dir.join("mapy_ca_cert.pem");
    let cert_path_str = cert_path.to_string_lossy().to_string();
    let home = std::env::var("HOME").unwrap_or_default();
    let login_keychain = format!("{home}/Library/Keychains/login.keychain-db");

    let escaped_cert_path = cert_path_str.replace('\'', "'\"'\"'");
    let shell_script = format!(
        "security delete-certificate -c 'Mapy Proxy CA' \"$HOME/Library/Keychains/login.keychain-db\" >/dev/null 2>&1 || true; \
         security delete-certificate -c 'Mapy Proxy CA' /Library/Keychains/System.keychain >/dev/null 2>&1 || true; \
         security add-trusted-cert -d -r trustRoot -p ssl -k /Library/Keychains/System.keychain '{escaped_cert_path}'"
    );
    let applescript = format!(
        "do shell script \"{}\" with administrator privileges",
        shell_script.replace('\\', "\\\\").replace('"', "\\\"")
    );

    let output = tokio::process::Command::new("osascript")
        .args(["-e", &applescript])
        .output()
        .await;

    match output {
        Ok(result) => {
            if result.status.success() {
                Json(json!({
                    "ok": true,
                    "message": "Certificate trusted in macOS System keychain"
                }))
                .into_response()
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr).to_string();
                let lower = stderr.to_lowercase();
                let cannot_prompt = lower.contains("no user interaction was possible")
                    || lower.contains("authorization was denied");

                if cannot_prompt {
                    let _ = tokio::process::Command::new("security")
                        .args(["delete-certificate", "-c", "Mapy Proxy CA", &login_keychain])
                        .output()
                        .await;
                    let login_output = tokio::process::Command::new("security")
                        .args([
                            "add-trusted-cert",
                            "-r",
                            "trustRoot",
                            "-p",
                            "ssl",
                            "-k",
                            &login_keychain,
                            &cert_path_str,
                        ])
                        .output()
                        .await;

                    match login_output {
                        Ok(login_result) if login_result.status.success() => {
                            return Json(json!({
                                "ok": true,
                                "message": "Certificate trusted in login keychain (system-keychain prompt unavailable in current context)"
                            }))
                            .into_response();
                        }
                        Ok(login_result) => {
                            let login_stderr =
                                String::from_utf8_lossy(&login_result.stderr).to_string();
                            let error_text = if login_stderr.trim().is_empty() {
                                "Certificate trust was canceled or failed".to_string()
                            } else {
                                login_stderr
                            };
                            return (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                Json(json!({ "ok": false, "error": error_text })),
                            )
                                .into_response();
                        }
                        Err(e) => {
                            return (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                Json(json!({
                                    "ok": false,
                                    "error": format!("Failed to install login keychain certificate: {e}")
                                })),
                            )
                                .into_response();
                        }
                    }
                }

                let error_text = if stderr.trim().is_empty() {
                    "Certificate trust was canceled or failed".to_string()
                } else {
                    stderr
                };
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "ok": false, "error": error_text })),
                )
                    .into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": format!("Failed to run osascript: {e}") })),
        )
            .into_response(),
    }
}

// --- Recording (system proxy toggle) handlers ---

pub async fn start_recording(State(state): State<AppState>) -> Response {
    match system_proxy::enable_system_proxy(configured_proxy_port()).await {
        Ok(()) => {
            state
                .recording
                .store(true, std::sync::atomic::Ordering::Relaxed);
            Json(json!({ "ok": true, "recording": true })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e })),
        )
            .into_response(),
    }
}

pub async fn stop_recording(State(state): State<AppState>) -> Response {
    match system_proxy::disable_system_proxy().await {
        Ok(()) => {
            state
                .recording
                .store(false, std::sync::atomic::Ordering::Relaxed);
            Json(json!({ "ok": true, "recording": false })).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e })),
        )
            .into_response(),
    }
}

pub async fn recording_status(State(state): State<AppState>) -> Json<Value> {
    let recording = state
        .recording
        .load(std::sync::atomic::Ordering::Relaxed);
    Json(json!({ "recording": recording }))
}
