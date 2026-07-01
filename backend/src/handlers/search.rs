use salvo::prelude::*;
use sqlx::SqlitePool;

use crate::response::{ok, PageData};
use crate::models::post::PostResponse;
use crate::handlers::post::build_post_response;

#[handler]
pub async fn search(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let q = req.query::<&str>("q").unwrap_or("").to_string();
    let page: i64 = req.query::<&str>("page").unwrap_or("1").parse().unwrap_or(1);
    let page_size: i64 = req.query::<&str>("page_size").unwrap_or("10").parse().unwrap_or(10);

    if q.trim().is_empty() {
        res.render(ok(PageData::<PostResponse> { list: vec![], total: 0, page, page_size }));
        return;
    }
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let pattern = format!("%{}%", q);
    let offset = (page - 1) * page_size;

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM posts WHERE (title LIKE ? OR content LIKE ?) AND status = 'published' AND deleted_at IS NULL"
    ).bind(&pattern).bind(&pattern).fetch_one(pool).await.unwrap_or(0);

    let rows = sqlx::query(
        "SELECT * FROM posts WHERE (title LIKE ?1 OR content LIKE ?1) AND status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
    ).bind(&pattern).bind(page_size).bind(offset).fetch_all(pool).await.unwrap_or_default();

    let mut list = Vec::new();
    for row in &rows { list.push(build_post_response(pool, row).await); }
    res.render(ok(PageData { list, total, page, page_size }));
}

#[handler]
pub async fn suggestions(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let q = req.query::<&str>("q").unwrap_or("");
    if q.len() < 2 { res.render(ok(Vec::<String>::new())); return; }
    let pattern = format!("%{}%", q);
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let titles: Vec<String> = sqlx::query_scalar(
        "SELECT title FROM posts WHERE title LIKE ? AND status = 'published' AND deleted_at IS NULL LIMIT 5"
    ).bind(&pattern).fetch_all(pool).await.unwrap_or_default();
    res.render(ok(titles));
}
