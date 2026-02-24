use crate::logs;
use crate::matching;
use crate::process_lookup;
use crate::response;
use crate::state::AppState;
use crate::store;

use hudsucker::{
    certificate_authority::RcgenAuthority,
    hyper::{Request, Response},
    rcgen::{CertificateParams, KeyPair},
    Body, HttpContext, HttpHandler, Proxy, RequestOrResponse,
};
use std::net::SocketAddr;

#[derive(Clone)]
struct MapyProxyHandler {
    state: AppState,
}

impl HttpHandler for MapyProxyHandler {
    async fn handle_request(
        &mut self,
        ctx: &HttpContext,
        req: Request<Body>,
    ) -> RequestOrResponse {
        let method_str = req.method().to_string();
        let path = req.uri().path().to_string();

        let axum_method = match axum::http::Method::from_bytes(method_str.as_bytes()) {
            Ok(m) => m,
            Err(_) => return req.into(),
        };

        let source_port = ctx.client_addr.port();
        let source_app = process_lookup::lookup_process_name(source_port).await;
        let host = req
            .headers()
            .get("host")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .or_else(|| req.uri().host().map(|h| h.to_string()));

        let store = store::read_store(&self.state).await;
        let active_profile = self.state.active_profile.lock().await.clone();

        let block_match =
            matching::find_block_match(&store, active_profile.as_deref(), &axum_method, &path);

        if let Some(found) = block_match.as_ref() {
            let (axum_response, logged_response) = response::build_block_response(found);

            let query = extract_query_params(req.uri());
            logs::record_request(
                &self.state,
                &axum_method,
                &path,
                &query,
                None,
                Some(found),
                Some(logged_response),
                source_app,
                host,
            )
            .await;

            if let Some(r) = axum_to_hudsucker_response(axum_response).await {
                return r.into();
            }
        }

        // No match — pass through to real server
        req.into()
    }

    async fn handle_response(
        &mut self,
        _ctx: &HttpContext,
        res: Response<Body>,
    ) -> Response<Body> {
        res
    }
}

fn extract_query_params(uri: &hudsucker::hyper::Uri) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    if let Some(query) = uri.query() {
        for pair in query.split('&') {
            if let Some((k, v)) = pair.split_once('=') {
                map.insert(k.to_string(), v.to_string());
            }
        }
    }
    map
}

async fn axum_to_hudsucker_response(axum_resp: axum::response::Response) -> Option<Response<Body>> {
    let (parts, body) = axum_resp.into_parts();

    let status = hudsucker::hyper::StatusCode::from_u16(parts.status.as_u16()).ok()?;

    // Collect the axum body bytes
    let body_bytes = axum::body::to_bytes(body, usize::MAX).await.ok()?;

    let mut builder = Response::builder().status(status);
    for (name, value) in parts.headers.iter() {
        builder = builder.header(name.as_str(), value.as_bytes());
    }

    builder
        .body(Body::from(http_body_util::Full::new(body_bytes)))
        .ok()
}

pub async fn run_forward_proxy(
    app_state: AppState,
    ca_cert_pem: String,
    ca_key_pem: String,
) -> Result<(), String> {
    let key_pair =
        KeyPair::from_pem(&ca_key_pem).map_err(|e| format!("Failed to parse CA key: {e}"))?;
    let ca_cert = CertificateParams::from_ca_cert_pem(&ca_cert_pem)
        .map_err(|e| format!("Failed to parse CA cert params: {e}"))?
        .self_signed(&key_pair)
        .map_err(|e| format!("Failed to sign CA cert: {e}"))?;

    let ca = RcgenAuthority::new(key_pair, ca_cert, 1_000);

    let handler = MapyProxyHandler { state: app_state };

    let proxy = Proxy::builder()
        .with_addr(SocketAddr::from(([0, 0, 0, 0], 9090)))
        .with_rustls_client()
        .with_ca(ca)
        .with_http_handler(handler)
        .build();

    proxy
        .start()
        .await
        .map_err(|e| format!("Proxy error: {e}"))
}
