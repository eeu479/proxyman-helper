use crate::types::{Block, BlockMatch, TemplateValue};
use serde_json::Value;

/// For array-type template values: substitute only enabled items as JSON array.
fn substitution_string_for_value(value: &TemplateValue) -> String {
    if value.value_type != "array" {
        return value.value.clone();
    }
    let trimmed = value.value.trim();
    if trimmed.is_empty() {
        return "[]".to_string();
    }
    let parsed: Option<Value> = serde_json::from_str(trimmed).ok();
    let Some(Value::Array(arr)) = parsed else {
        return value.value.clone();
    };
    let mut enabled: Vec<String> = Vec::new();
    for item in arr {
        if let Some(obj) = item.as_object() {
            let v = obj
                .get("v")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let e = obj.get("e").and_then(Value::as_bool).unwrap_or(true);
            if e {
                enabled.push(v);
            }
        } else if let Some(s) = item.as_str() {
            enabled.push(s.to_string());
        }
    }
    serde_json::to_string(&enabled).unwrap_or_else(|_| value.value.clone())
}

pub fn render_template(template: &str, values: &[TemplateValue]) -> String {
    let mut output = template.to_string();
    for value in values {
        if value.key.is_empty() {
            continue;
        }
        let needle = format!("{{{{{}}}}}", value.key);
        let replacement = substitution_string_for_value(value);
        output = output.replace(&needle, &replacement);
    }
    output
}

pub fn active_template_values(block: &Block) -> &[TemplateValue] {
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

pub fn merged_template_values(block_match: &BlockMatch) -> Vec<TemplateValue> {
    let mut values = active_template_values(&block_match.block).to_vec();
    for (key, value) in &block_match.extracted_params {
        if values.iter().any(|item| item.key == *key) {
            continue;
        }
        values.push(TemplateValue {
            id: format!("path-param-{}", key),
            key: key.clone(),
            value: value.clone(),
            value_type: "string".to_string(),
        });
    }
    values
}

pub fn normalize_json_quotes(value: &str) -> String {
    value.replace('\u{201C}', "\"").replace('\u{201D}', "\"")
}
