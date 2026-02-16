use axum::{
  body::{Body, Bytes},
  extract::{Path, Query, State},
  http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, Uri},
  response::{IntoResponse, Response},
  routing::{any, get, post, put},
  Json, Router,
};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
  collections::HashMap,
  collections::VecDeque,
  path::{PathBuf},
  sync::Arc,
  time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

const DEFAULT_PROFILES_JSON: &str = include_str!("../../data/profiles.json");

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct Store {
  #[serde(default)]
  profiles: Vec<Profile>,
  #[serde(default)]
  active_profile: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct Profile {
  name: String,
  #[serde(default)]
  base_url: String,
  #[serde(default)]
  params: Vec<String>,
  #[serde(default)]
  sub_profiles: Vec<SubProfile>,
  #[serde(default)]
  requests: Vec<RequestConfig>,
  #[serde(default)]
  library_blocks: Vec<Block>,
  #[serde(default)]
  active_blocks: Vec<Block>,
  #[serde(default)]
  categories: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct SubProfile {
  name: String,
  #[serde(default)]
  params: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct RequestConfig {
  name: String,
  path: String,
  #[serde(default)]
  method: String,
  #[serde(default)]
  headers: HashMap<String, String>,
  #[serde(default)]
  query_parameters: HashMap<String, String>,
  #[serde(default)]
  body: HashMap<String, String>,
  #[serde(default)]
  params: HashMap<String, String>,
  #[serde(default)]
  response: Option<ResponseConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct Block {
  id: String,
  name: String,
  method: String,
  #[serde(default)]
  path: String,
  description: String,
  response_template: String,
  #[serde(default)]
  response_headers: HashMap<String, String>,
  #[serde(default)]
  template_values: Vec<TemplateValue>,
  #[serde(default)]
  template_variants: Vec<TemplateVariant>,
  #[serde(default)]
  active_variant_id: Option<String>,
  #[serde(default)]
  category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct TemplateValue {
  id: String,
  key: String,
  value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct TemplateVariant {
  id: String,
  name: String,
  #[serde(default)]
  values: Vec<TemplateValue>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ResponseConfig {
  #[serde(default)]
  status: Option<u16>,
  #[serde(default)]
  headers: HashMap<String, String>,
  #[serde(default)]
  body: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct BlocksPayload {
  #[serde(default)]
  library_blocks: Vec<Block>,
  #[serde(default)]
  active_blocks: Vec<Block>,
  #[serde(default)]
  categories: Vec<String>,
}

#[derive(Debug, Clone)]
struct AppState {
  data_file: Arc<PathBuf>,
  write_lock: Arc<Mutex<()>>,
  log_store: Arc<Mutex<LogStore>>,
  active_profile: Arc<Mutex<Option<String>>>,
  http_client: reqwest::Client,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RequestLogEntry {
  timestamp_ms: u128,
  method: String,
  path: String,
  query: HashMap<String, String>,
  matched: bool,
  profile: Option<String>,
  sub_profile: Option<String>,
  request: Option<String>,
  block: Option<String>,
  response: Option<LoggedResponse>,
}

#[derive(Debug, Hash, Eq, PartialEq, Clone)]
struct MatchKey {
  profile: String,
  request: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RequestMatchCount {
  profile: String,
  request: String,
  count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct LoggedResponse {
  #[serde(default)]
  status: Option<u16>,
  #[serde(default)]
  headers: HashMap<String, String>,
  #[serde(default)]
  body: Option<String>,
}

#[derive(Debug, Default)]
struct LogStore {
  entries: VecDeque<RequestLogEntry>,
  counts: HashMap<MatchKey, u64>,
}

const MAX_LOG_ENTRIES: usize = 500;

#[derive(Debug, Clone)]
struct MatchResult {
  profile: Profile,
  sub_profile: SubProfile,
  request: RequestConfig,
  extracted_params: HashMap<String, String>,
}

#[derive(Debug, Clone)]
struct BlockMatch {
  profile: Profile,
  block: Block,
  extracted_params: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProfileInput {
  name: String,
  base_url: Option<String>,
  params: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateProfileInput {
  name: Option<String>,
  base_url: Option<String>,
  params: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CreateSubProfileInput {
  name: String,
  params: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
struct UpdateSubProfileInput {
  name: Option<String>,
  params: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRequestInput {
  name: String,
  method: Option<String>,
  path: String,
  query_parameters: Option<HashMap<String, String>>,
  headers: Option<HashMap<String, String>>,
  body: Option<HashMap<String, String>>,
  params: Option<HashMap<String, String>>,
  response: Option<ResponseConfig>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActiveProfileResponse {
  name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetActiveProfileInput {
  name: String,
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        if let Some(window) = app.get_webview_window("main") {
          window.open_devtools();
        }
      }
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        if let Err(error) = run_server(app_handle).await {
          eprintln!("Server error: {error}");
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

async fn run_server(app_handle: tauri::AppHandle) -> Result<(), String> {
  let data_dir = app_handle
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;
  let data_file = data_dir.join("profiles.json");
  ensure_data_file(&data_file).await?;

  let state = AppState {
    data_file: Arc::new(data_file),
    write_lock: Arc::new(Mutex::new(())),
    log_store: Arc::new(Mutex::new(LogStore::default())),
    active_profile: Arc::new(Mutex::new(None)),
    http_client: reqwest::Client::new(),
  };
  let store = read_store(&state).await;
  *state.active_profile.lock().await = store.active_profile.clone();

  let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_methods([
      Method::GET,
      Method::POST,
      Method::PUT,
      Method::PATCH,
      Method::DELETE,
    ])
    .allow_headers(Any);

  let app = Router::new()
    .route("/api/health", get(health))
    .route("/api/profiles", get(list_profiles).post(create_profile))
    .route(
      "/api/profiles/:profile_name",
      get(get_profile).put(update_profile).delete(delete_profile),
    )
    .route(
      "/api/profiles/:profile_name/subprofiles",
      post(create_sub_profile),
    )
    .route(
      "/api/profiles/:profile_name/subprofiles/:subprofile_name",
      put(update_sub_profile).delete(delete_sub_profile),
    )
    .route(
      "/api/profiles/:profile_name/requests",
      post(create_request),
    )
    .route(
      "/api/profiles/:profile_name/blocks",
      get(get_blocks).put(update_blocks),
    )
    .route("/api/active-profile", get(get_active_profile).put(set_active_profile))
    .route("/api/logs", get(get_logs))
    .route("/api/request-counts", get(get_request_counts))
    .route("/*path", any(proxy_handler))
    .with_state(state)
    .layer(cors);

  let port = std::env::var("LOCAL_PROXY_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(3000);

  let listener = tokio::net::TcpListener::bind(("127.0.0.1", port))
    .await
    .map_err(|error| error.to_string())?;

  axum::serve(listener, app)
    .await
    .map_err(|error| error.to_string())
}

async fn ensure_data_file(path: &PathBuf) -> Result<(), String> {
  if let Some(parent) = path.parent() {
    tokio::fs::create_dir_all(parent)
      .await
      .map_err(|error| error.to_string())?;
  }

  if tokio::fs::metadata(path).await.is_ok() {
    return Ok(());
  }

  tokio::fs::write(path, DEFAULT_PROFILES_JSON)
    .await
    .map_err(|error| error.to_string())
}

async fn read_store(state: &AppState) -> Store {
  match tokio::fs::read_to_string(&*state.data_file).await {
    Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
    Err(_) => default_store(),
  }
}

async fn write_store(state: &AppState, store: &Store) -> Result<(), String> {
  let _guard = state.write_lock.lock().await;
  if let Some(parent) = state.data_file.parent() {
    tokio::fs::create_dir_all(parent)
      .await
      .map_err(|error| error.to_string())?;
  }
  let payload = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
  tokio::fs::write(&*state.data_file, payload)
    .await
    .map_err(|error| error.to_string())
}

fn default_store() -> Store {
  serde_json::from_str(DEFAULT_PROFILES_JSON).unwrap_or_default()
}

async fn health() -> Json<Value> {
  Json(json!({ "ok": true }))
}

async fn list_profiles(State(state): State<AppState>) -> Json<Vec<Profile>> {
  let store = read_store(&state).await;
  Json(store.profiles)
}

async fn get_logs(State(state): State<AppState>) -> Json<Vec<RequestLogEntry>> {
  let log_store = state.log_store.lock().await;
  Json(log_store.entries.iter().cloned().collect())
}

async fn get_request_counts(State(state): State<AppState>) -> Json<Vec<RequestMatchCount>> {
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

async fn get_profile(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
) -> Response {
  let store = read_store(&state).await;
  match store.profiles.into_iter().find(|profile| profile.name == profile_name) {
    Some(profile) => Json(profile).into_response(),
    None => (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" }))).into_response(),
  }
}

async fn create_profile(
  State(state): State<AppState>,
  Json(input): Json<CreateProfileInput>,
) -> Response {
  let mut store = read_store(&state).await;
  if store.profiles.iter().any(|profile| profile.name == input.name) {
    return (
      StatusCode::CONFLICT,
      Json(json!({ "error": "Profile already exists" })),
    )
      .into_response();
  }

  let profile = Profile {
    name: input.name,
    base_url: input.base_url.unwrap_or_default(),
    params: input.params.unwrap_or_default(),
    sub_profiles: Vec::new(),
    requests: Vec::new(),
    library_blocks: Vec::new(),
    active_blocks: Vec::new(),
    categories: Vec::new(),
  };
  store.profiles.push(profile.clone());

  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }

  (StatusCode::CREATED, Json(profile)).into_response()
}

async fn update_profile(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
  Json(input): Json<UpdateProfileInput>,
) -> Response {
  let mut store = read_store(&state).await;
  let active_profile = state.active_profile.lock().await.clone();
  if let Some(next_name) = input.name.clone() {
    if next_name.is_empty() {
      return (
        StatusCode::BAD_REQUEST,
        Json(json!({ "error": "Profile name cannot be empty" })),
      )
        .into_response();
    }

    if next_name != profile_name
      && store.profiles.iter().any(|item| item.name == next_name)
    {
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
      return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
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

  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }

  Json(updated_profile).into_response()
}

async fn delete_profile(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
) -> Response {
  let mut store = read_store(&state).await;
  let initial_len = store.profiles.len();
  let was_active = state
    .active_profile
    .lock()
    .await
    .as_deref()
    == Some(profile_name.as_str());
  store.profiles.retain(|p| p.name != profile_name);
  if store.profiles.len() == initial_len {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
      .into_response();
  }
  if was_active {
    let next_active = store.profiles.first().map(|p| p.name.clone());
    store.active_profile = next_active.clone();
    *state.active_profile.lock().await = next_active;
  }
  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }
  (StatusCode::NO_CONTENT, ()).into_response()
}

async fn create_sub_profile(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
  Json(input): Json<CreateSubProfileInput>,
) -> Response {
  let mut store = read_store(&state).await;
  let Some(profile) = store
    .profiles
    .iter_mut()
    .find(|profile| profile.name == profile_name)
  else {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
      .into_response();
  };

  if profile.sub_profiles.iter().any(|sub| sub.name == input.name) {
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

  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }

  (StatusCode::CREATED, Json(sub_profile)).into_response()
}

async fn update_sub_profile(
  State(state): State<AppState>,
  Path((profile_name, subprofile_name)): Path<(String, String)>,
  Json(input): Json<UpdateSubProfileInput>,
) -> Response {
  let mut store = read_store(&state).await;

  let Some(profile) = store
    .profiles
    .iter()
    .find(|profile| profile.name == profile_name)
  else {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
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
      && profile
        .sub_profiles
        .iter()
        .any(|sub| sub.name == next_name)
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
      return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
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

  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }

  Json(updated_subprofile).into_response()
}

async fn delete_sub_profile(
  State(state): State<AppState>,
  Path((profile_name, subprofile_name)): Path<(String, String)>,
) -> Response {
  let mut store = read_store(&state).await;
  let Some(profile) = store
    .profiles
    .iter_mut()
    .find(|profile| profile.name == profile_name)
  else {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
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

  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }

  StatusCode::NO_CONTENT.into_response()
}

async fn create_request(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
  Json(input): Json<CreateRequestInput>,
) -> Response {
  let mut store = read_store(&state).await;
  let Some(profile) = store
    .profiles
    .iter_mut()
    .find(|profile| profile.name == profile_name)
  else {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
      .into_response();
  };

  if profile.requests.iter().any(|request| request.name == input.name) {
    return (
      StatusCode::CONFLICT,
      Json(json!({ "error": "Request already exists" })),
    )
      .into_response();
  }

  let request = RequestConfig {
    name: input.name,
    method: input.method.unwrap_or_else(|| "GET".to_string()).to_uppercase(),
    path: input.path,
    query_parameters: input.query_parameters.unwrap_or_default(),
    headers: input.headers.unwrap_or_default(),
    body: input.body.unwrap_or_default(),
    params: input.params.unwrap_or_default(),
    response: input.response,
  };
  profile.requests.push(request.clone());

  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }

  (StatusCode::CREATED, Json(request)).into_response()
}

async fn get_blocks(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
) -> Response {
  let store = read_store(&state).await;
  let Some(profile) = store
    .profiles
    .into_iter()
    .find(|profile| profile.name == profile_name)
  else {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
      .into_response();
  };

  Json(BlocksPayload {
    library_blocks: profile.library_blocks,
    active_blocks: profile.active_blocks,
    categories: profile.categories,
  })
  .into_response()
}

async fn update_blocks(
  State(state): State<AppState>,
  Path(profile_name): Path<String>,
  Json(input): Json<BlocksPayload>,
) -> Response {
  let mut store = read_store(&state).await;
  let Some(profile) = store
    .profiles
    .iter_mut()
    .find(|profile| profile.name == profile_name)
  else {
    return (StatusCode::NOT_FOUND, Json(json!({ "error": "Profile not found" })))
      .into_response();
  };

  profile.library_blocks = input.library_blocks.clone();
  profile.active_blocks = input.active_blocks.clone();
  profile.categories = input.categories.clone();

  if let Err(error) = write_store(&state, &store).await {
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

async fn get_active_profile(State(state): State<AppState>) -> Json<ActiveProfileResponse> {
  let active_profile = state.active_profile.lock().await.clone();
  Json(ActiveProfileResponse {
    name: active_profile,
  })
}

async fn set_active_profile(
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

  let mut store = read_store(&state).await;
  if !store.profiles.iter().any(|profile| profile.name == name) {
    return (
      StatusCode::NOT_FOUND,
      Json(json!({ "error": "Profile not found" })),
    )
      .into_response();
  }

  *state.active_profile.lock().await = Some(name.clone());
  store.active_profile = Some(name.clone());
  if let Err(error) = write_store(&state, &store).await {
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(json!({ "error": error })),
    )
      .into_response();
  }
  Json(ActiveProfileResponse {
    name: Some(name),
  })
  .into_response()
}

async fn proxy_handler(
  State(state): State<AppState>,
  method: Method,
  uri: Uri,
  headers: HeaderMap,
  Query(query): Query<HashMap<String, String>>,
  body: Bytes,
) -> Response {
  let store = read_store(&state).await;
  let path = uri.path().to_string();
  let active_profile = state.active_profile.lock().await.clone();
  let block_match = find_block_match(&store, active_profile.as_deref(), &method, &path);
  if let Some(found) = block_match.as_ref() {
    let (response, logged_response) = build_block_response(found);
    record_request(
      &state,
      &method,
      &path,
      &query,
      None,
      Some(found),
      Some(logged_response),
    )
    .await;
    return response;
  }
  let match_result = find_match(
    &store,
    &method,
    &path,
    &headers,
    &query,
    active_profile.as_deref(),
  );
  match match_result {
    Some(found) => {
      let (response, logged_response) = build_response(&found, &path, &query);
      record_request(
        &state,
        &method,
        &path,
        &query,
        Some(&found),
        None,
        Some(logged_response),
      )
      .await;
      response
    }
    None => {
      let (response, logged_response) = proxy_request(
        &state,
        &store,
        active_profile.as_deref(),
        &method,
        uri,
        headers,
        body,
      )
      .await;
      record_request(&state, &method, &path, &query, None, None, Some(logged_response)).await;
      response
    }
  }
}

async fn record_request(
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

fn find_match(
  store: &Store,
  method: &Method,
  path: &str,
  headers: &HeaderMap,
  query: &HashMap<String, String>,
  active_profile: Option<&str>,
) -> Option<MatchResult> {
  let active_profile = active_profile?;
  for profile in &store.profiles {
    if profile.name != active_profile {
      continue;
    }
    for sub_profile in &profile.sub_profiles {
      for request in &profile.requests {
        if !method_matches(request, method) {
          continue;
        }

        if !headers_match(&request.headers, headers) {
          continue;
        }

        if !query_match(&request.query_parameters, query) {
          continue;
        }

        let mut params = sub_profile.params.clone();
        params.extend(request.params.clone());

        let template = build_request_path(profile, request);
        let (regex, tokens) = compile_path_matcher(&template, &params);
        if let Some(captures) = regex.captures(path) {
          let extracted = extract_params(&tokens, &captures);
          return Some(MatchResult {
            profile: profile.clone(),
            sub_profile: sub_profile.clone(),
            request: request.clone(),
            extracted_params: extracted,
          });
        }
      }
    }
  }

  None
}

fn find_block_match(
  store: &Store,
  active_profile: Option<&str>,
  method: &Method,
  path: &str,
) -> Option<BlockMatch> {
  let active_profile = active_profile?;
  let profile = store
    .profiles
    .iter()
    .find(|profile| profile.name == active_profile)?
    .clone();
  for block in profile.active_blocks.iter() {
    if !block_method_matches(block, method) {
      continue;
    }
    let block_path = derive_block_path(block)?;
    if block_path == path {
      return Some(BlockMatch {
        profile: profile.clone(),
        block: block.clone(),
        extracted_params: HashMap::new(),
      });
    }
    if block_path.contains('{') && block_path.contains('}') {
      let (regex, tokens) = compile_path_matcher(&block_path, &HashMap::new());
      if let Some(captures) = regex.captures(path) {
        let extracted = extract_params(&tokens, &captures);
        return Some(BlockMatch {
          profile: profile.clone(),
          block: block.clone(),
          extracted_params: extracted,
        });
      }
    }
  }

  None
}

fn method_matches(request: &RequestConfig, method: &Method) -> bool {
  if request.method.is_empty() || request.method == "*" {
    return true;
  }
  request.method.to_uppercase() == method.as_str()
}

fn headers_match(expected: &HashMap<String, String>, actual: &HeaderMap) -> bool {
  expected.iter().all(|(key, value)| {
    let header_value = actual
      .get(key.as_str())
      .and_then(|value| value.to_str().ok());
    header_value.map(|actual| actual == value).unwrap_or(false)
  })
}

fn block_method_matches(block: &Block, method: &Method) -> bool {
  if block.method.is_empty() || block.method == "*" {
    return true;
  }
  block.method.to_uppercase() == method.as_str()
}

fn derive_block_path(block: &Block) -> Option<String> {
  if !block.path.is_empty() {
    return Some(block.path.clone());
  }
  let trimmed = block.description.trim();
  let (_, path) = trimmed.split_once(' ')?;
  if path.starts_with('/') {
    Some(path.to_string())
  } else {
    None
  }
}

fn query_match(expected: &HashMap<String, String>, actual: &HashMap<String, String>) -> bool {
  expected
    .iter()
    .all(|(key, value)| actual.get(key).map(|actual| actual == value).unwrap_or(false))
}

fn build_request_path(profile: &Profile, request: &RequestConfig) -> String {
  let base = normalize_path(&profile.base_url);
  let path = normalize_path(&request.path);
  if profile.base_url.is_empty() {
    return path;
  }
  if base.ends_with('/') && path.starts_with('/') {
    format!("{}{}", base.trim_end_matches('/'), path)
  } else {
    format!("{}{}", base, path)
  }
}

fn normalize_path(value: &str) -> String {
  if value.is_empty() {
    "/".to_string()
  } else if value.starts_with('/') {
    value.to_string()
  } else {
    format!("/{}", value)
  }
}

#[derive(Debug)]
struct ParamToken {
  name: String,
  value: Option<String>,
  capture: bool,
}

fn compile_path_matcher(
  template: &str,
  param_values: &HashMap<String, String>,
) -> (Regex, Vec<ParamToken>) {
  let param_regex = Regex::new(r"\{([^}]+)\}").expect("invalid param regex");
  let mut pattern = String::new();
  let mut tokens = Vec::new();
  let mut last_index = 0;

  for capture in param_regex.captures_iter(template) {
    let match_span = capture.get(0).expect("capture span");
    pattern.push_str(&regex::escape(&template[last_index..match_span.start()]));

    let name = capture
      .get(1)
      .expect("capture group")
      .as_str()
      .trim()
      .to_string();

    if let Some(value) = param_values.get(&name) {
      pattern.push_str(&regex::escape(value));
      tokens.push(ParamToken {
        name,
        value: Some(value.clone()),
        capture: false,
      });
    } else {
      pattern.push_str("([^/]+)");
      tokens.push(ParamToken {
        name,
        value: None,
        capture: true,
      });
    }

    last_index = match_span.end();
  }

  pattern.push_str(&regex::escape(&template[last_index..]));
  let regex = Regex::new(&format!("^{}$", pattern)).expect("invalid matcher regex");

  (regex, tokens)
}

fn extract_params(tokens: &[ParamToken], captures: &regex::Captures) -> HashMap<String, String> {
  let mut values = HashMap::new();
  let mut capture_index = 1;

  for token in tokens {
    if let Some(value) = &token.value {
      values.insert(token.name.clone(), value.clone());
    } else if token.capture {
      if let Some(value) = captures.get(capture_index) {
        values.insert(token.name.clone(), value.as_str().to_string());
      }
      capture_index += 1;
    }
  }

  values
}

fn build_response(
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

fn build_block_response(block_match: &BlockMatch) -> (Response, LoggedResponse) {
  let template_values = merged_template_values(block_match);
  let rendered = render_template(
    &block_match.block.response_template,
    &template_values,
  );
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

fn render_template(template: &str, values: &[TemplateValue]) -> String {
  let mut output = template.to_string();
  for value in values {
    if value.key.is_empty() {
      continue;
    }
    let needle = format!("{{{{{}}}}}", value.key);
    output = output.replace(&needle, &value.value);
  }
  output
}

fn active_template_values(block: &Block) -> &[TemplateValue] {
  if let Some(active_id) = block.active_variant_id.as_deref() {
    if let Some(variant) = block
      .template_variants
      .iter()
      .find(|variant| variant.id == active_id)
    {
      return &variant.values;
    }
  }
  if let Some(variant) = block.template_variants.first() {
    return &variant.values;
  }
  &block.template_values
}

fn merged_template_values(block_match: &BlockMatch) -> Vec<TemplateValue> {
  let mut values = active_template_values(&block_match.block).to_vec();
  for (key, value) in &block_match.extracted_params {
    if values.iter().any(|item| item.key == *key) {
      continue;
    }
    values.push(TemplateValue {
      id: format!("path-param-{}", key),
      key: key.clone(),
      value: value.clone(),
    });
  }
  values
}

fn normalize_json_quotes(value: &str) -> String {
  value.replace('\u{201C}', "\"").replace('\u{201D}', "\"")
}

fn header_map_to_string_map(headers: &HeaderMap) -> HashMap<String, String> {
  let mut next = HashMap::new();
  for (name, value) in headers.iter() {
    if let Ok(value) = value.to_str() {
      next.insert(name.to_string(), value.to_string());
    }
  }
  next
}

fn json_error_response(status: StatusCode, message: String) -> (Response, LoggedResponse) {
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

async fn proxy_request(
  state: &AppState,
  store: &Store,
  active_profile: Option<&str>,
  method: &Method,
  uri: Uri,
  headers: HeaderMap,
  body: Bytes,
) -> (Response, LoggedResponse) {
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
  let upstream_method = reqwest::Method::from_bytes(method.as_str().as_bytes())
    .unwrap_or(reqwest::Method::GET);
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

  let status = StatusCode::from_u16(upstream.status().as_u16())
    .unwrap_or(StatusCode::BAD_GATEWAY);
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
  let logged_response = LoggedResponse {
    status: Some(status.as_u16()),
    headers: header_map_to_string_map(response.headers()),
    body: Some(body_text),
  };

  (response, logged_response)
}

fn resolve_active_profile(store: &Store, active_profile: Option<&str>) -> Option<Profile> {
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
