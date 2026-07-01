use salvo::prelude::*;
use sqlx::SqlitePool;
use sqlx::Row;
use serde::Serialize;

use crate::response::{ok, err};
use crate::utils::jwt::get_auth;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub post_count: i64,
    pub comment_count: i64,
    pub user_count: i64,
    pub today_pv: i64,
    pub today_uv: i64,
    pub total_views: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopPost {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub view_count: i64,
}

#[handler]
pub async fn overview(_req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let post_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL").fetch_one(pool).await.unwrap_or(0);
    let comment_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL").fetch_one(pool).await.unwrap_or(0);
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users").fetch_one(pool).await.unwrap_or(0);
    let total_views: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(view_count),0) FROM posts WHERE deleted_at IS NULL").fetch_one(pool).await.unwrap_or(0);

    res.render(ok(Overview { post_count, comment_count, user_count, today_pv: 0, today_uv: 0, total_views }));
}

#[handler]
pub async fn top_posts(_req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let rows = sqlx::query("SELECT id, title, slug, view_count FROM posts WHERE deleted_at IS NULL ORDER BY view_count DESC LIMIT 10")
        .fetch_all(pool).await.unwrap_or_default();
    let list: Vec<TopPost> = rows.iter().map(|r| TopPost {
        id: r.get("id"), title: r.get("title"), slug: r.get("slug"), view_count: r.get("view_count"),
    }).collect();
    res.render(ok(list));
}
