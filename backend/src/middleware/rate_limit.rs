use salvo::prelude::*;
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use chrono::Utc;

use crate::response::ApiResponse;

static RATE_LIMITS: Lazy<Mutex<HashMap<String, Vec<i64>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[handler]
pub async fn rate_limit_middleware(req: &mut Request, res: &mut Response) {
    let path = req.uri().path().to_string();
    if !path.contains("/login") && !path.contains("/register") {
        return;
    }

    let ip = req.remote_addr().to_string();
    let key = format!("{}:{}", ip, path);
    let now = Utc::now().timestamp();
    let window: i64 = 60;
    let max_requests = 5;

    let mut limits = RATE_LIMITS.lock().unwrap();
    let entry = limits.entry(key).or_default();
    entry.retain(|&t| t > now - window);
    entry.push(now);

    if entry.len() > max_requests {
        res.status_code(StatusCode::TOO_MANY_REQUESTS);
        res.render(Json(ApiResponse { code: 429, message: "too many requests".into(), data: () }));
    }
}
