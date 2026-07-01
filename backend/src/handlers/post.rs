use salvo::prelude::*;
use sqlx::SqlitePool;
use chrono::Utc;
use sqlx::Row;

use crate::models::post::*;
use crate::response::{ok, err, PageData};
use crate::utils::jwt::get_auth;

fn slugify(title: &str) -> String { slug::slugify(title) }

async fn ensure_unique_slug(pool: &SqlitePool, base: &str, exclude_id: Option<i64>) -> String {
    let mut s = base.to_string();
    let mut n = 1;
    loop {
        let count: i64 = if let Some(eid) = exclude_id {
            sqlx::query_scalar("SELECT COUNT(*) FROM posts WHERE slug = ? AND id != ? AND deleted_at IS NULL")
                .bind(&s).bind(eid).fetch_one(pool).await.unwrap_or(1)
        } else {
            sqlx::query_scalar("SELECT COUNT(*) FROM posts WHERE slug = ? AND deleted_at IS NULL")
                .bind(&s).fetch_one(pool).await.unwrap_or(1)
        };
        if count == 0 { break; }
        s = format!("{}-{}", base, n);
        n += 1;
    }
    s
}

pub async fn build_post_response(pool: &SqlitePool, row: &sqlx::sqlite::SqliteRow) -> PostResponse {
    let post_id: i64 = row.get("id");
    let author_id: i64 = row.get("author_id");
    let category_id: Option<i64> = row.get("category_id");

    let author = sqlx::query("SELECT username, avatar FROM users WHERE id = ?").bind(author_id).fetch_optional(pool).await.ok().flatten();
    let author_name = author.as_ref().map(|r: &sqlx::sqlite::SqliteRow| r.get::<String, _>("username")).unwrap_or_default();
    let author_avatar: Option<String> = author.and_then(|r: sqlx::sqlite::SqliteRow| r.get("avatar"));

    let category_name: Option<String> = if let Some(cid) = category_id {
        sqlx::query_scalar("SELECT name FROM categories WHERE id = ?").bind(cid).fetch_optional(pool).await.ok().flatten()
    } else { None };

    let tag_rows = sqlx::query("SELECT t.id, t.name, t.slug FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?")
        .bind(post_id).fetch_all(pool).await.unwrap_or_default();
    let tags: Vec<TagInfo> = tag_rows.iter().map(|r| TagInfo { id: r.get("id"), name: r.get("name"), slug: r.get("slug") }).collect();

    PostResponse {
        id: post_id, title: row.get("title"), slug: row.get("slug"), content: row.get("content"),
        summary: row.get("summary"), cover: row.get("cover"), author_id, author_name, author_avatar,
        category_id, category_name,
        status: row.get("status"), pinned: row.get::<i32, _>("pinned") != 0,
        view_count: row.get("view_count"), comment_count: row.get("comment_count"),
        published_at: row.get("published_at"), created_at: row.get("created_at"), updated_at: row.get("updated_at"), tags,
    }
}

#[handler]
pub async fn list_posts(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let page: i64 = req.query::<&str>("page").unwrap_or("1").parse().unwrap_or(1);
    let page_size: i64 = req.query::<&str>("page_size").unwrap_or("10").parse().unwrap_or(10);
    let cat_id: Option<i64> = req.query::<&str>("category_id").and_then(|s| s.parse().ok());
    let tag_id: Option<i64> = req.query::<&str>("tag_id").and_then(|s| s.parse().ok());
    let status = req.query::<&str>("status").unwrap_or("published");
    let sort = req.query::<&str>("sort").unwrap_or("latest");
    let offset = (page - 1) * page_size;

    let order = if sort == "popular" { "pinned DESC, view_count DESC" } else { "pinned DESC, created_at DESC" };

    let (total, rows) = if let Some(tid) = tag_id {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(DISTINCT p.id) FROM posts p JOIN post_tags pt ON p.id = pt.post_id WHERE pt.tag_id = ? AND p.status = ? AND p.deleted_at IS NULL"
        ).bind(tid).bind(status).fetch_one(pool).await.unwrap_or(0);

        let sql = format!("SELECT p.* FROM posts p JOIN post_tags pt ON p.id = pt.post_id WHERE pt.tag_id = ?1 AND p.status = ?2 AND p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT ?3 OFFSET ?4");
        let rows = sqlx::query(&sql).bind(tid).bind(status).bind(page_size).bind(offset).fetch_all(pool).await.unwrap_or_default();
        (total, rows)
    } else if let Some(cid) = cat_id {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM posts WHERE category_id = ? AND status = ? AND deleted_at IS NULL"
        ).bind(cid).bind(status).fetch_one(pool).await.unwrap_or(0);
        let rows = sqlx::query("SELECT * FROM posts WHERE category_id = ?1 AND status = ?2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?3 OFFSET ?4")
            .bind(cid).bind(status).bind(page_size).bind(offset).fetch_all(pool).await.unwrap_or_default();
        (total, rows)
    } else {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL AND (? = 'all' OR status = ?)"
        ).bind(status).bind(status).fetch_one(pool).await.unwrap_or(0);

        let sql = format!("SELECT * FROM posts WHERE deleted_at IS NULL AND (?1 = 'all' OR status = ?1) ORDER BY {} LIMIT ?2 OFFSET ?3", order);
        let rows = sqlx::query(&sql).bind(status).bind(page_size).bind(offset).fetch_all(pool).await.unwrap_or_default();
        (total, rows)
    };

    let mut list = Vec::new();
    for row in &rows { list.push(build_post_response(pool, row).await); }

    res.render(ok(PageData { list, total, page, page_size }));
}

#[handler]
pub async fn get_post(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let post_slug = req.param::<String>("param").unwrap_or_default();
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let row = sqlx::query("SELECT * FROM posts WHERE slug = ? AND deleted_at IS NULL").bind(&post_slug).fetch_optional(pool).await;
    match row {
        Ok(Some(r)) => {
            let post_id: i64 = r.get("id");
            sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").bind(post_id).execute(pool).await.ok();
            res.render(ok(build_post_response(pool, &r).await));
        }
        _ => res.render(err(404, "post not found", ())),
    }
}

#[handler]
pub async fn create_post(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let input: CreatePostInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let status = input.status.as_deref().unwrap_or("draft");
    let slug = ensure_unique_slug(pool, &slugify(&input.title), None).await;
    let now = Utc::now().naive_utc();
    let published_at = if status == "published" { Some(now) } else { None };

    let result = sqlx::query(
        "INSERT INTO posts (title, slug, content, summary, cover, author_id, category_id, status, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(&input.title).bind(&slug).bind(&input.content).bind(&input.summary).bind(&input.cover)
     .bind(auth.user_id).bind(input.category_id).bind(status).bind(published_at).bind(now).bind(now)
     .execute(pool).await.unwrap();

    let post_id = result.last_insert_rowid();

    if let Some(tag_ids) = &input.tag_ids {
        for tid in tag_ids {
            sqlx::query("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?,?)").bind(post_id).bind(tid).execute(pool).await.ok();
            sqlx::query("UPDATE tags SET post_count = post_count + 1 WHERE id = ?").bind(tid).execute(pool).await.ok();
        }
    }
    if let Some(cid) = input.category_id {
        sqlx::query("UPDATE categories SET post_count = post_count + 1 WHERE id = ?").bind(cid).execute(pool).await.ok();
    }

    let row = sqlx::query("SELECT * FROM posts WHERE id = ?").bind(post_id).fetch_one(pool).await.unwrap();
    res.status_code(StatusCode::CREATED);
    res.render(ok(build_post_response(pool, &row).await));
}

#[handler]
pub async fn update_post(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let post_id: i64 = match req.param::<String>("param").and_then(|s| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let input: UpdatePostInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let r = sqlx::query("SELECT author_id, status FROM posts WHERE id = ? AND deleted_at IS NULL").bind(post_id).fetch_optional(pool).await;
    let (owner_id, old_status): (i64, String) = match r {
        Ok(Some(rr)) => (rr.get("author_id"), rr.get("status")),
        _ => { res.render(err(404, "post not found", ())); return; }
    };
    if owner_id != auth.user_id && auth.role != "admin" { res.render(err(403, "forbidden", ())); return; }

    let mut parts = vec![];
    if let Some(t) = &input.title {
        let new_slug = ensure_unique_slug(pool, &slugify(t), Some(post_id)).await;
        parts.push(format!("title = '{}'", t.replace('\'', "''")));
        parts.push(format!("slug = '{}'", new_slug.replace('\'', "''")));
    }
    if let Some(c) = &input.content { parts.push(format!("content = '{}'", c.replace('\'', "''"))); }
    if let Some(s) = &input.summary { parts.push(format!("summary = '{}'", s.replace('\'', "''"))); }
    if let Some(cv) = &input.cover { parts.push(format!("cover = '{}'", cv.replace('\'', "''"))); }
    if let Some(cid) = input.category_id { parts.push(format!("category_id = {}", cid)); }
    if let Some(st) = &input.status {
        parts.push(format!("status = '{}'", st.replace('\'', "''")));
        if st == "published" && old_status != "published" { parts.push("published_at = datetime('now')".into()); }
    }
    if !parts.is_empty() {
        parts.push("updated_at = datetime('now')".into());
        sqlx::query(&format!("UPDATE posts SET {} WHERE id = {}", parts.join(", "), post_id)).execute(pool).await.ok();
    }
    if let Some(tag_ids) = &input.tag_ids {
        sqlx::query("DELETE FROM post_tags WHERE post_id = ?").bind(post_id).execute(pool).await.ok();
        for tid in tag_ids { sqlx::query("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?,?)").bind(post_id).bind(tid).execute(pool).await.ok(); }
        sqlx::query("UPDATE tags SET post_count = (SELECT COUNT(*) FROM post_tags WHERE tag_id = tags.id)").execute(pool).await.ok();
    }

    let row = sqlx::query("SELECT * FROM posts WHERE id = ?").bind(post_id).fetch_one(pool).await.unwrap();
    res.render(ok(build_post_response(pool, &row).await));
}

#[handler]
pub async fn delete_post(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let post_id: i64 = match req.param::<String>("param").and_then(|s| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let r = sqlx::query("SELECT author_id FROM posts WHERE id = ? AND deleted_at IS NULL").bind(post_id).fetch_optional(pool).await;
    match r {
        Ok(Some(rr)) => {
            let owner: i64 = rr.get("author_id");
            if owner != auth.user_id && auth.role != "admin" { res.render(err(403, "forbidden", ())); return; }
            sqlx::query("UPDATE posts SET deleted_at = datetime('now') WHERE id = ?").bind(post_id).execute(pool).await.ok();
            res.render(ok(()));
        }
        _ => res.render(err(404, "post not found", ())),
    }
}

#[handler]
pub async fn list_drafts(_req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let rows = sqlx::query("SELECT * FROM posts WHERE author_id = ? AND status = 'draft' AND deleted_at IS NULL ORDER BY updated_at DESC")
        .bind(auth.user_id).fetch_all(pool).await.unwrap_or_default();
    let mut list = Vec::new();
    for r in &rows { list.push(build_post_response(pool, r).await); }
    res.render(ok(list));
}

#[handler]
pub async fn toggle_pin(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let post_id: i64 = match req.param::<String>("param").and_then(|s| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    sqlx::query("UPDATE posts SET pinned = NOT pinned WHERE id = ?").bind(post_id).execute(pool).await.ok();
    res.render(ok(()));
}
