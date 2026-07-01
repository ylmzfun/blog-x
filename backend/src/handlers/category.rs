use salvo::prelude::*;
use sqlx::SqlitePool;
use sqlx::Row;

use crate::models::category::*;
use crate::response::{ok, err};
use crate::utils::jwt::get_auth;

fn row_to_cat(r: &sqlx::sqlite::SqliteRow) -> CategoryResponse {
    CategoryResponse {
        id: r.get("id"), name: r.get("name"), slug: r.get("slug"),
        description: r.get("description"), post_count: r.get("post_count"),
        created_at: r.get("created_at"), updated_at: r.get("updated_at"),
    }
}

#[handler]
pub async fn list_categories(_req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let rows = sqlx::query("SELECT * FROM categories ORDER BY name").fetch_all(pool).await.unwrap_or_default();
    res.render(ok(rows.iter().map(|r| row_to_cat(r)).collect::<Vec<_>>()));
}

#[handler]
pub async fn get_category(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let cat_slug = req.param::<String>("param").unwrap_or_default();
    let pool = depot.obtain::<SqlitePool>().unwrap();
    match sqlx::query("SELECT * FROM categories WHERE slug = ?").bind(&cat_slug).fetch_optional(pool).await {
        Ok(Some(r)) => res.render(ok(row_to_cat(&r))),
        _ => res.render(err(404, "not found", ())),
    }
}

#[handler]
pub async fn create_category(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let input: CreateCategoryInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let r = sqlx::query("INSERT INTO categories (name, slug, description) VALUES (?,?,?)")
        .bind(&input.name).bind(&input.slug).bind(&input.description).execute(pool).await.unwrap();
    let row = sqlx::query("SELECT * FROM categories WHERE id = ?").bind(r.last_insert_rowid()).fetch_one(pool).await.unwrap();
    res.status_code(StatusCode::CREATED);
    res.render(ok(row_to_cat(&row)));
}

#[handler]
pub async fn update_category(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let id: i64 = match req.param::<String>("param").and_then(|s| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let input: UpdateCategoryInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let mut parts = vec![];
    if let Some(n) = &input.name { parts.push(format!("name = '{}'", n.replace('\'', "''"))); }
    if let Some(s) = &input.slug { parts.push(format!("slug = '{}'", s.replace('\'', "''"))); }
    if let Some(d) = &input.description { parts.push(format!("description = '{}'", d.replace('\'', "''"))); }
    if !parts.is_empty() {
        parts.push("updated_at = datetime('now')".into());
        sqlx::query(&format!("UPDATE categories SET {} WHERE id = {}", parts.join(", "), id)).execute(pool).await.ok();
    }
    res.render(ok(()));
}

#[handler]
pub async fn delete_category(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let id: i64 = match req.param::<String>("param").and_then(|s| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    sqlx::query("DELETE FROM categories WHERE id = ?").bind(id).execute(pool).await.ok();
    res.render(ok(()));
}
