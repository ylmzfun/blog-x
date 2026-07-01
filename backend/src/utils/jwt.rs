use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};
use salvo::prelude::*;

use crate::response::ApiResponse;

static JWT_SECRET: Lazy<String> = Lazy::new(|| {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "blog-secret-key-change-in-production".into())
});

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: i64,
    pub username: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
    pub token_type: String,
}

pub fn create_access_token(user_id: i64, username: &str, role: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        username: username.into(),
        role: role.into(),
        iat: now.timestamp() as usize,
        exp: (now + Duration::hours(2)).timestamp() as usize,
        token_type: "access".into(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET.as_bytes()))
}

pub fn create_refresh_token(user_id: i64, username: &str, role: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        username: username.into(),
        role: role.into(),
        iat: now.timestamp() as usize,
        exp: (now + Duration::days(7)).timestamp() as usize,
        token_type: "refresh".into(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET.as_bytes()))
}

pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    decode::<Claims>(token, &DecodingKey::from_secret(JWT_SECRET.as_bytes()), &Validation::default())
        .map(|d| d.claims)
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AuthUser {
    pub user_id: i64,
    pub username: String,
    pub role: String,
}

#[handler]
pub async fn auth_middleware(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let token = req.headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");

    if token.is_empty() {
        res.status_code(StatusCode::UNAUTHORIZED);
        res.render(Json(ApiResponse { code: 401, message: "missing token".into(), data: () }));
        return;
    }

    match verify_token(token) {
        Ok(claims) => {
            if claims.token_type != "access" {
                res.status_code(StatusCode::UNAUTHORIZED);
                res.render(Json(ApiResponse { code: 401, message: "invalid token type".into(), data: () }));
                return;
            }
            depot.insert("auth", AuthUser {
                user_id: claims.sub,
                username: claims.username,
                role: claims.role,
            });
        }
        Err(_) => {
            res.status_code(StatusCode::UNAUTHORIZED);
            res.render(Json(ApiResponse { code: 401, message: "invalid token".into(), data: () }));
        }
    }
}

pub fn get_auth(depot: &Depot) -> Option<&AuthUser> {
    depot.obtain::<AuthUser>().ok()
}
