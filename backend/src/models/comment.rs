use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommentResponse {
    pub id: i64,
    pub post_id: i64,
    pub author_id: i64,
    pub author_name: String,
    pub author_avatar: Option<String>,
    pub content: String,
    pub parent_id: Option<i64>,
    pub status: String,
    pub created_at: NaiveDateTime,
    pub children: Vec<CommentResponse>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommentInput {
    pub content: String,
    pub parent_id: Option<i64>,
}
