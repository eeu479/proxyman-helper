use std::collections::HashMap;
use tokio::sync::Mutex;

static CACHE: std::sync::LazyLock<Mutex<HashMap<u16, String>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

pub async fn lookup_process_name(source_port: u16) -> Option<String> {
    {
        let cache = CACHE.lock().await;
        if let Some(name) = cache.get(&source_port) {
            return Some(name.clone());
        }
    }

    let name = resolve_process_name(source_port).await?;

    {
        let mut cache = CACHE.lock().await;
        cache.insert(source_port, name.clone());
    }

    Some(name)
}

async fn resolve_process_name(source_port: u16) -> Option<String> {
    let lsof_output = tokio::process::Command::new("lsof")
        .args([
            "-i",
            &format!("TCP@127.0.0.1:{source_port}"),
            "-n",
            "-P",
            "-Fp",
        ])
        .output()
        .await
        .ok()?;

    let stdout = String::from_utf8_lossy(&lsof_output.stdout);
    let pid = stdout
        .lines()
        .find(|line| line.starts_with('p'))
        .map(|line| &line[1..])?;

    let ps_output = tokio::process::Command::new("ps")
        .args(["-p", pid, "-o", "comm="])
        .output()
        .await
        .ok()?;

    let comm = String::from_utf8_lossy(&ps_output.stdout).trim().to_string();
    if comm.is_empty() {
        return None;
    }

    Some(extract_app_name(&comm))
}

fn extract_app_name(path: &str) -> String {
    // Look for .app bundle in path: /Applications/Safari.app/Contents/MacOS/Safari -> "Safari"
    for component in path.split('/') {
        if let Some(name) = component.strip_suffix(".app") {
            return name.to_string();
        }
    }
    // Fallback to executable filename
    path.rsplit('/').next().unwrap_or(path).to_string()
}
