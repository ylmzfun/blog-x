use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostResponse {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub summary: Option<String>,
    pub cover: Option<String>,
    pub author_id: i64,
    pub author_name: String,
    pub author_avatar: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub status: String,
    pub pinned: bool,
    pub view_count: i64,
    pub comment_count: i64,
    pub published_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub tags: Vec<TagInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInfo {
    pub id: i64,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePostInput {
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub cover: Option<String>,
    pub category_id: Option<i64>,
    pub tag_ids: Option<Vec<i64>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub cover: Option<String>,
    pub category_id: Option<i64>,
    pub tag_ids: Option<Vec<i64>>,
    pub status: Option<String>,
}
