use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagResponse {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub post_count: i64,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub slug: String,
}
