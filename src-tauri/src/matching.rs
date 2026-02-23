use crate::types::{Block, BlockMatch, MatchResult, Profile, RequestConfig, Store};
use axum::http::{HeaderMap, Method};
use regex::Regex;
use std::collections::HashMap;

pub fn find_match(
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

pub fn find_block_match(
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
    expected.iter().all(|(key, value)| {
        actual
            .get(key)
            .map(|actual| actual == value)
            .unwrap_or(false)
    })
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
