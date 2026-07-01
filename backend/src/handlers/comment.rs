use salvo::prelude::*;
use sqlx::SqlitePool;
use sqlx::Row;
use std::collections::HashMap;

use crate::models::comment::*;
use crate::response::{ok, err, PageData};
use crate::utils::jwt::get_auth;

async fn build_tree(pool: &SqlitePool, comments: &[sqlx::sqlite::SqliteRow]) -> Vec<CommentResponse> {
    let mut nodes: Vec<CommentResponse> = Vec::new();
    let mut children_map: HashMap<i64, Vec<CommentResponse>> = HashMap::new();

    for c in comments {
        let id: i64 = c.get("id");
        let author_id: i64 = c.get("author_id");
        let author = sqlx::query("SELECT username, avatar FROM users WHERE id = ?").bind(author_id).fetch_optional(pool).await.ok().flatten();
        let node = CommentResponse {
            id, post_id: c.get("post_id"), author_id,
            author_name: author.as_ref().map(|r: &sqlx::sqlite::SqliteRow| r.get::<String, _>("username")).unwrap_or_default(),
            author_avatar: author.and_then(|r: sqlx::sqlite::SqliteRow| r.get("avatar")),
            content: c.get("content"),
            parent_id: c.get("parent_id"),
            status: c.get("status"),
            created_at: c.get("created_at"),
            children: Vec::new(),
        };
        if let Some(pid) = node.parent_id {
            children_map.entry(pid).or_default().push(node);
        } else {
            nodes.push(node);
        }
    }

    fn attach(nodes: &mut Vec<CommentResponse>, map: &HashMap<i64, Vec<CommentResponse>>) {
        for n in nodes {
            if let Some(kids) = map.get(&n.id) {
                n.children = kids.clone();
                // Re-borrow to attach recursively
                let children = &mut n.children;
                let map_ref = map;
                fn inner(ns: &mut Vec<CommentResponse>, m: &HashMap<i64, Vec<CommentResponse>>) {
                    for n in ns {
                        if let Some(kids) = m.get(&n.id) { n.children = kids.clone(); inner(&mut n.children, m); }
                    }
                }
                inner(children, map_ref);
            }
        }
    }
    attach(&mut nodes, &children_map);
    nodes
}

#[handler]
pub async fn list_comments(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let post_id: i64 = match req.param("postId").and_then(|s: &str| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid post id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let page: i64 = req.query::<&str>("page").unwrap_or("1").parse().unwrap_or(1);
    let page_size: i64 = req.query::<&str>("page_size").unwrap_or("20").parse().unwrap_or(20);
    let offset = (page - 1) * page_size;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'approved' AND deleted_at IS NULL")
        .bind(post_id).fetch_one(pool).await.unwrap_or(0);

    let rows = sqlx::query("SELECT * FROM comments WHERE post_id = ? AND status = 'approved' AND deleted_at IS NULL ORDER BY created_at ASC LIMIT ? OFFSET ?")
        .bind(post_id).bind(page_size).bind(offset).fetch_all(pool).await.unwrap_or_default();

    let tree = build_tree(pool, &rows).await;
    res.render(ok(PageData { list: tree, total, page, page_size }));
}

#[handler]
pub async fn create_comment(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let post_id: i64 = match req.param("postId").and_then(|s: &str| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid post id", ())); return; } };
    let input: CreateCommentInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };

    if input.content.trim().is_empty() { res.render(err(400, "comment cannot be empty", ())); return; }
    let pool = depot.obtain::<SqlitePool>().unwrap();

    if let Some(pid) = input.parent_id {
        let parent = sqlx::query("SELECT post_id FROM comments WHERE id = ? AND deleted_at IS NULL").bind(pid).fetch_optional(pool).await;
        match parent {
            Ok(Some(p)) => { let pp: i64 = p.get("post_id"); if pp != post_id { res.render(err(400, "parent comment mismatch", ())); return; } }
            _ => { res.render(err(404, "parent not found", ())); return; }
        }
    }

    let r = sqlx::query("INSERT INTO comments (post_id, author_id, content, parent_id) VALUES (?,?,?,?)")
        .bind(post_id).bind(auth.user_id).bind(&input.content).bind(input.parent_id).execute(pool).await.unwrap();
    sqlx::query("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?").bind(post_id).execute(pool).await.ok();

    let row = sqlx::query("SELECT * FROM comments WHERE id = ?").bind(r.last_insert_rowid()).fetch_one(pool).await.unwrap();
    let author = sqlx::query("SELECT username, avatar FROM users WHERE id = ?").bind(auth.user_id).fetch_optional(pool).await.ok().flatten();
    let resp = CommentResponse {
        id: row.get("id"), post_id: row.get("post_id"), author_id: auth.user_id,
        author_name: author.as_ref().map(|r: &sqlx::sqlite::SqliteRow| r.get::<String, _>("username")).unwrap_or_default(),
        author_avatar: author.and_then(|r: sqlx::sqlite::SqliteRow| r.get("avatar")),
        content: row.get("content"), parent_id: row.get("parent_id"),
        status: row.get("status"), created_at: row.get("created_at"), children: vec![],
    };
    res.status_code(StatusCode::CREATED);
    res.render(ok(resp));
}

#[handler]
pub async fn delete_comment(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let comment_id: i64 = match req.param("id").and_then(|s: &str| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    let row = sqlx::query("SELECT author_id, post_id FROM comments WHERE id = ? AND deleted_at IS NULL").bind(comment_id).fetch_optional(pool).await;
    match row {
        Ok(Some(r)) => {
            let aid: i64 = r.get("author_id");
            if aid != auth.user_id && auth.role != "admin" { res.render(err(403, "forbidden", ())); return; }
            sqlx::query("UPDATE comments SET deleted_at = datetime('now') WHERE id = ?").bind(comment_id).execute(pool).await.ok();
            res.render(ok(()));
        }
        _ => res.render(err(404, "comment not found", ())),
    }
}

#[handler]
pub async fn approve_comment(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    if auth.role != "admin" { res.render(err(403, "admin only", ())); return; }
    let comment_id: i64 = match req.param("id").and_then(|s: &str| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    sqlx::query("UPDATE comments SET status = 'approved' WHERE id = ?").bind(comment_id).execute(pool).await.ok();
    res.render(ok(()));
}
