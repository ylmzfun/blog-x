use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: i64,
    pub username: String,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
    pub role: String,
    pub email_verified: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

impl UserResponse {
    pub fn from_row(r: &sqlx::sqlite::SqliteRow) -> Self {
        Self {
            id: r.get("id"),
            username: r.get("username"),
            email: r.get("email"),
            avatar: r.get("avatar"),
            bio: r.get("bio"),
            website: r.get("website"),
            role: r.get("role"),
            email_verified: r.get::<i32, _>("email_verified") != 0,
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RegisterInput {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub account: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

#[derive(Debug, Deserialize)]
pub struct RefreshInput {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileInput {
    pub username: Option<String>,
    pub bio: Option<String>,
    pub website: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordInput {
    pub old_password: String,
    pub new_password: String,
}
