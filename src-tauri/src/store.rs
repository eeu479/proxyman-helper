use crate::state::AppState;
use crate::types::{Library, Profile, Store};
use std::path::PathBuf;

const DEFAULT_PROFILES_JSON: &str = include_str!("../../data/profiles.json");

pub fn ensure_profile_libraries(profile: &mut Profile) {
    if profile.libraries.is_empty() {
        profile.libraries = vec![Library {
            id: "local".to_string(),
            name: "Local".to_string(),
            lib_type: "local".to_string(),
            folder_path: None,
        }];
    }
}

pub fn migrate_store(store: &mut Store) {
    for profile in &mut store.profiles {
        ensure_profile_libraries(profile);
    }
}

pub async fn ensure_data_file(path: &PathBuf) -> Result<(), String> {
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

pub async fn read_store(state: &AppState) -> Store {
    let mut store = match tokio::fs::read_to_string(&*state.data_file).await {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => default_store(),
    };
    migrate_store(&mut store);
    store
}

pub async fn write_store(state: &AppState, store: &Store) -> Result<(), String> {
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

pub fn default_store() -> Store {
    serde_json::from_str(DEFAULT_PROFILES_JSON).unwrap_or_default()
}
