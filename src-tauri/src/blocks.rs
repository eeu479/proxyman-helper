use crate::types::Block;
use std::collections::{HashMap, HashSet};
use std::path::Path;

/// Sanitizes a string for use as part of a filename: replace unsafe chars with `_`, trim, collapse repeated `_`.
/// Returns `fallback` if the result would be empty.
pub(crate) fn sanitize_for_filename(s: &str, fallback: &str) -> String {
    const UNSAFE: &[char] = &['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
    let safe: String = s
        .chars()
        .map(|c| if UNSAFE.contains(&c) { '_' } else { c })
        .collect();
    let trimmed = safe.trim().trim_matches('_');
    let collapsed: String = trimmed
        .chars()
        .fold((String::new(), false), |(mut acc, mut prev_underscore), c| {
            let is_underscore = c == '_';
            if is_underscore && prev_underscore {
                (acc, true)
            } else {
                prev_underscore = is_underscore;
                acc.push(c);
                (acc, prev_underscore)
            }
        })
        .0;
    if collapsed.is_empty() {
        fallback.to_string()
    } else {
        collapsed
    }
}

/// Builds a stable mapping from block.id to filename stem: `method-requestName` or `method-requestName-2`, etc.
fn blocks_to_filename_stems(blocks: &[Block]) -> HashMap<String, String> {
    let method_fallback = "REQUEST";
    let name_fallback = "unnamed";
    #[derive(Eq, PartialEq, Hash, Clone)]
    struct Key {
        method: String,
        name: String,
    }
    let mut groups: HashMap<Key, Vec<&Block>> = HashMap::new();
    for block in blocks {
        let method = sanitize_for_filename(
            &block.method.trim().to_uppercase(),
            method_fallback,
        );
        let name = if block.name.trim().is_empty() {
            sanitize_for_filename(&block.id, name_fallback)
        } else {
            sanitize_for_filename(block.name.trim(), name_fallback)
        };
        let key = Key {
            method: method.clone(),
            name: name.clone(),
        };
        groups.entry(key).or_default().push(block);
    }
    for group in groups.values_mut() {
        group.sort_by(|a, b| a.id.cmp(&b.id));
    }
    let mut out = HashMap::new();
    for (key, group) in groups {
        let base = format!("{}-{}", key.method, key.name);
        for (i, block) in group.into_iter().enumerate() {
            let stem = if i == 0 {
                base.clone()
            } else {
                format!("{}-{}", base, i + 1)
            };
            out.insert(block.id.clone(), stem);
        }
    }
    out
}

pub async fn read_blocks_from_path(path: &Path, library_id: &str) -> Vec<Block> {
    let blocks_dir = path.join("blocks");
    let mut entries = match tokio::fs::read_dir(&blocks_dir).await {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };
    let mut blocks = Vec::new();
    while let Ok(Some(entry)) = entries.next_entry().await {
        let entry_path = entry.path();
        if entry_path.is_file() {
            if let Some(ext) = entry_path.extension() {
                if ext == "json" {
                    if let Ok(data) = tokio::fs::read_to_string(&entry_path).await {
                        if let Ok(mut block) = serde_json::from_str::<Block>(&data) {
                            block.source_library_id = Some(library_id.to_string());
                            blocks.push(block);
                        }
                    }
                }
            }
        }
    }
    blocks
}

pub async fn write_blocks_to_path(path: &Path, blocks: &[Block]) -> Result<(), String> {
    let blocks_dir = path.join("blocks");
    tokio::fs::create_dir_all(&blocks_dir)
        .await
        .map_err(|e| e.to_string())?;
    let id_to_stem = blocks_to_filename_stems(blocks);
    let new_stems: HashSet<String> = id_to_stem.values().cloned().collect();
    let mut entries = tokio::fs::read_dir(&blocks_dir)
        .await
        .map_err(|e| e.to_string())?;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let entry_path = entry.path();
        if entry_path.is_file() {
            if let Some(stem) = entry_path.file_stem().and_then(|s| s.to_str()) {
                if !new_stems.contains(stem) {
                    let _ = tokio::fs::remove_file(&entry_path).await;
                }
            }
        }
    }
    for block in blocks {
        let stem = id_to_stem.get(&block.id).map(String::as_str).unwrap_or(&block.id);
        let json = serde_json::to_string_pretty(block).map_err(|e| e.to_string())?;
        let f = blocks_dir.join(format!("{}.json", stem));
        tokio::fs::write(&f, json)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
