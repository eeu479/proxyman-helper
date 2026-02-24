use tokio::process::Command;

/// Detect the primary active network service by parsing `networksetup -listnetworkserviceorder`.
/// Falls back to "Wi-Fi" if detection fails.
pub async fn detect_active_service() -> String {
    let output = Command::new("networksetup")
        .arg("-listnetworkserviceorder")
        .output()
        .await;

    let Ok(output) = output else {
        return "Wi-Fi".to_string();
    };

    let text = String::from_utf8_lossy(&output.stdout);

    // Lines look like:
    // (1) Wi-Fi
    // (Hardware Port: Wi-Fi, Device: en0)
    // We parse pairs: service name line followed by hardware port line with a device.
    // Then check if the device (e.g. en0) is active via ifconfig.
    let lines: Vec<&str> = text.lines().collect();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();
        // Match service name line like "(1) Wi-Fi"
        if let Some(pos) = line.find(')') {
            let service_name = line[pos + 1..].trim();
            // Next line should have the device
            if i + 1 < lines.len() {
                let hw_line = lines[i + 1].trim();
                if let Some(device) = parse_device(hw_line) {
                    if is_device_active(&device).await {
                        return service_name.to_string();
                    }
                }
            }
        }
        i += 1;
    }

    "Wi-Fi".to_string()
}

fn parse_device(hw_line: &str) -> Option<String> {
    // Format: (Hardware Port: Wi-Fi, Device: en0)
    let device_marker = "Device: ";
    let start = hw_line.find(device_marker)? + device_marker.len();
    let end = hw_line[start..].find(')')? + start;
    let device = hw_line[start..end].trim();
    if device.is_empty() || device == "*" {
        return None;
    }
    Some(device.to_string())
}

async fn is_device_active(device: &str) -> bool {
    let output = Command::new("ifconfig")
        .arg(device)
        .output()
        .await;

    match output {
        Ok(o) => {
            let text = String::from_utf8_lossy(&o.stdout);
            text.contains("status: active")
        }
        Err(_) => false,
    }
}

pub async fn enable_system_proxy(port: u16) -> Result<(), String> {
    let service = detect_active_service().await;
    let port_str = port.to_string();

    run_networksetup(&["-setwebproxy", &service, "127.0.0.1", &port_str]).await?;
    run_networksetup(&["-setsecurewebproxy", &service, "127.0.0.1", &port_str]).await?;

    Ok(())
}

pub async fn disable_system_proxy() -> Result<(), String> {
    let service = detect_active_service().await;

    run_networksetup(&["-setwebproxystate", &service, "off"]).await?;
    run_networksetup(&["-setsecurewebproxystate", &service, "off"]).await?;

    Ok(())
}

async fn run_networksetup(args: &[&str]) -> Result<(), String> {
    let output = Command::new("networksetup")
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Failed to run networksetup: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("networksetup failed: {stderr}"));
    }

    Ok(())
}
