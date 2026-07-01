use salvo::prelude::*;
use sqlx::SqlitePool;
use sqlx::Row;

use crate::models::tag::*;
use crate::response::{ok, err};
use crate::utils::jwt::get_auth;

#[handler]
pub async fn list_tags(_req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let rows = sqlx::query("SELECT * FROM tags ORDER BY post_count DESC").fetch_all(pool).await.unwrap_or_default();
    let list: Vec<TagResponse> = rows.iter().map(|r| TagResponse {
        id: r.get("id"), name: r.get("name"), slug: r.get("slug"),
        post_count: r.get("post_count"), created_at: r.get("created_at"),
    }).collect();
    res.render(ok(list));
}

#[handler]
pub async fn create_tag(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let _auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let input: CreateTagInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    match sqlx::query("INSERT INTO tags (name, slug) VALUES (?,?)").bind(&input.name).bind(&input.slug).execute(pool).await {
        Ok(r) => {
            let row = sqlx::query("SELECT * FROM tags WHERE id = ?").bind(r.last_insert_rowid()).fetch_one(pool).await.unwrap();
            res.status_code(StatusCode::CREATED);
            res.render(ok(TagResponse { id: row.get("id"), name: row.get("name"), slug: row.get("slug"), post_count: row.get("post_count"), created_at: row.get("created_at") }));
        }
        Err(e) => {
            let msg = if e.to_string().contains("UNIQUE") { "tag already exists" } else { "create failed" };
            res.render(err(400, msg, ()));
        }
    }
}

#[handler]
pub async fn delete_tag(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let id: i64 = match req.param("id").and_then(|s: &str| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    sqlx::query("DELETE FROM post_tags WHERE tag_id = ?").bind(id).execute(pool).await.ok();
    sqlx::query("DELETE FROM tags WHERE id = ?").bind(id).execute(pool).await.ok();
    res.render(ok(()));
}
