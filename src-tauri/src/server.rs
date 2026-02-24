use crate::handlers;
use crate::state::{AppState, LogStore};
use crate::store;
use axum::http::Method;
use axum::routing::{any, get, post, put};
use axum::Router;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

pub async fn run_server(app_handle: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    let data_file = data_dir.join("profiles.json");
    store::ensure_data_file(&data_file).await?;

    let state = AppState {
        data_file: Arc::new(data_file),
        write_lock: Arc::new(Mutex::new(())),
        log_store: Arc::new(Mutex::new(LogStore::default())),
        active_profile: Arc::new(Mutex::new(None)),
        http_client: reqwest::Client::new(),
    };
    let store = store::read_store(&state).await;
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
        .route("/api/health", get(handlers::health))
        .route(
            "/api/profiles",
            get(handlers::list_profiles).post(handlers::create_profile),
        )
        .route(
            "/api/profiles/:profile_name",
            get(handlers::get_profile)
                .put(handlers::update_profile)
                .delete(handlers::delete_profile),
        )
        .route(
            "/api/profiles/:profile_name/subprofiles",
            post(handlers::create_sub_profile),
        )
        .route(
            "/api/profiles/:profile_name/subprofiles/:subprofile_name",
            put(handlers::update_sub_profile).delete(handlers::delete_sub_profile),
        )
        .route(
            "/api/profiles/:profile_name/requests",
            post(handlers::create_request),
        )
        .route(
            "/api/profiles/:profile_name/libraries",
            get(handlers::get_libraries).post(handlers::add_library),
        )
        .route(
            "/api/profiles/:profile_name/libraries/:lib_id",
            put(handlers::update_library).delete(handlers::delete_library),
        )
        .route(
            "/api/profiles/:profile_name/blocks",
            get(handlers::get_blocks).put(handlers::update_blocks),
        )
        .route(
            "/api/active-profile",
            get(handlers::get_active_profile).put(handlers::set_active_profile),
        )
        .route("/api/logs", get(handlers::get_logs))
        .route("/api/request-counts", get(handlers::get_request_counts))
        .route("/*path", any(handlers::proxy_handler))
        .with_state(state)
        .layer(cors);

    let port = std::env::var("MAPY_PORT")
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
