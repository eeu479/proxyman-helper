use rcgen::{CertificateParams, DistinguishedName, DnType, IsCa, BasicConstraints, KeyPair, KeyUsagePurpose};
use std::path::Path;
use tokio::fs;

const CA_CERT_FILENAME: &str = "mapy_ca_cert.pem";
const CA_KEY_FILENAME: &str = "mapy_ca_key.pem";

pub struct CaFiles {
    pub cert_pem: String,
    pub key_pem: String,
}

pub async fn ensure_ca(data_dir: &Path) -> Result<CaFiles, String> {
    let cert_path = data_dir.join(CA_CERT_FILENAME);
    let key_path = data_dir.join(CA_KEY_FILENAME);

    if cert_path.exists() && key_path.exists() {
        let cert_pem = fs::read_to_string(&cert_path)
            .await
            .map_err(|e| format!("Failed to read CA cert: {e}"))?;
        let key_pem = fs::read_to_string(&key_path)
            .await
            .map_err(|e| format!("Failed to read CA key: {e}"))?;
        return Ok(CaFiles { cert_pem, key_pem });
    }

    let key_pair = KeyPair::generate().map_err(|e| format!("Failed to generate key pair: {e}"))?;

    let mut params = CertificateParams::default();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params.distinguished_name = {
        let mut dn = DistinguishedName::new();
        dn.push(DnType::CommonName, "Mapy Proxy CA");
        dn.push(DnType::OrganizationName, "Mapy");
        dn
    };
    params.key_usages = vec![
        KeyUsagePurpose::KeyCertSign,
        KeyUsagePurpose::CrlSign,
    ];
    // Valid for ~10 years
    let not_before = time::OffsetDateTime::now_utc();
    let not_after = not_before + time::Duration::days(3650);
    params.not_before = not_before;
    params.not_after = not_after;

    let cert = params
        .self_signed(&key_pair)
        .map_err(|e| format!("Failed to generate CA cert: {e}"))?;

    let cert_pem = cert.pem();
    let key_pem = key_pair.serialize_pem();

    fs::create_dir_all(data_dir)
        .await
        .map_err(|e| format!("Failed to create data dir: {e}"))?;
    fs::write(&cert_path, &cert_pem)
        .await
        .map_err(|e| format!("Failed to write CA cert: {e}"))?;
    fs::write(&key_path, &key_pem)
        .await
        .map_err(|e| format!("Failed to write CA key: {e}"))?;

    Ok(CaFiles { cert_pem, key_pem })
}
