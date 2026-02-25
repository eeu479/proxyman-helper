use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

fn default_value_type() -> String {
    "string".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Store {
    #[serde(default)]
    pub profiles: Vec<Profile>,
    #[serde(default)]
    pub active_profile: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub name: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub params: Vec<String>,
    #[serde(default)]
    pub sub_profiles: Vec<SubProfile>,
    #[serde(default)]
    pub requests: Vec<RequestConfig>,
    #[serde(default)]
    pub library_blocks: Vec<Block>,
    #[serde(default)]
    pub active_blocks: Vec<Block>,
    #[serde(default)]
    pub categories: Vec<String>,
    #[serde(default)]
    pub libraries: Vec<Library>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SubProfile {
    pub name: String,
    #[serde(default)]
    pub params: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RequestConfig {
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub method: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub query_parameters: HashMap<String, String>,
    #[serde(default)]
    pub body: HashMap<String, String>,
    #[serde(default)]
    pub params: HashMap<String, String>,
    #[serde(default)]
    pub response: Option<ResponseConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub lib_type: String,
    /// For remote (folder) libraries, absolute path to the folder. Legacy: deserialize from "clonePath".
    #[serde(default, alias = "clonePath")]
    pub folder_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Block {
    pub id: String,
    pub name: String,
    pub method: String,
    #[serde(default)]
    pub path: String,
    pub description: String,
    pub response_template: String,
    #[serde(default)]
    pub response_headers: HashMap<String, String>,
    #[serde(default)]
    pub template_values: Vec<TemplateValue>,
    #[serde(default)]
    pub template_variants: Vec<TemplateVariant>,
    #[serde(default)]
    pub active_variant_id: Option<String>,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub source_library_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TemplateValue {
    pub id: String,
    pub key: String,
    pub value: String,
    #[serde(default = "default_value_type")]
    pub value_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TemplateVariant {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub values: Vec<TemplateValue>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResponseConfig {
    #[serde(default)]
    pub status: Option<u16>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BlocksPayload {
    #[serde(default)]
    pub library_blocks: Vec<Block>,
    #[serde(default)]
    pub active_blocks: Vec<Block>,
    #[serde(default)]
    pub categories: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct MatchResult {
    pub profile: Profile,
    pub sub_profile: SubProfile,
    pub request: RequestConfig,
    pub extracted_params: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct BlockMatch {
    pub profile: Profile,
    pub block: Block,
    pub extracted_params: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProfileInput {
    pub name: String,
    pub base_url: Option<String>,
    pub params: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileInput {
    pub name: Option<String>,
    pub base_url: Option<String>,
    pub params: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSubProfileInput {
    pub name: String,
    pub params: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSubProfileInput {
    pub name: Option<String>,
    pub params: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequestInput {
    pub name: String,
    pub method: Option<String>,
    pub path: String,
    pub query_parameters: Option<HashMap<String, String>>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<HashMap<String, String>>,
    pub params: Option<HashMap<String, String>>,
    pub response: Option<ResponseConfig>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveProfileResponse {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetActiveProfileInput {
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLibraryInput {
    pub name: String,
    #[serde(rename = "type")]
    pub lib_type: String,
    #[serde(default)]
    pub folder_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLibraryInput {
    #[serde(default)]
    pub name: Option<String>,
}
