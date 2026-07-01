use salvo::prelude::*;
use sqlx::SqlitePool;
use sqlx::Row;
use bcrypt::{hash, verify, DEFAULT_COST};

use crate::models::user::*;
use crate::response::{ok, err};
use crate::utils::jwt::get_auth;

#[handler]
pub async fn get_me(_req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let row = sqlx::query("SELECT * FROM users WHERE id = ?").bind(auth.user_id).fetch_one(pool).await;
    match row {
        Ok(r) => res.render(ok(UserResponse::from_row(&r))),
        Err(_) => res.render(err(404, "user not found", ())),
    }
}

#[handler]
pub async fn update_me(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let input: UpdateProfileInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let mut parts = vec![];
    if let Some(u) = &input.username { parts.push(format!("username = '{}'", u.replace('\'', "''"))); }
    if let Some(b) = &input.bio { parts.push(format!("bio = '{}'", b.replace('\'', "''"))); }
    if let Some(w) = &input.website { parts.push(format!("website = '{}'", w.replace('\'', "''"))); }
    if parts.is_empty() { res.render(err(400, "no fields", ())); return; }
    parts.push("updated_at = datetime('now')".into());
    let sql = format!("UPDATE users SET {} WHERE id = {}", parts.join(", "), auth.user_id);
    sqlx::query(&sql).execute(pool).await.ok();
    res.render(ok(()));
}

#[handler]
pub async fn change_password(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let input: ChangePasswordInput = match req.parse_json().await { Ok(v) => v, Err(_) => { res.render(err(400, "invalid input", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let row = sqlx::query("SELECT password_hash FROM users WHERE id = ?").bind(auth.user_id).fetch_one(pool).await;
    match row {
        Ok(r) => {
            let hash_str: String = r.get("password_hash");
            if !verify(&input.old_password, &hash_str).unwrap_or(false) {
                res.render(err(400, "old password incorrect", ())); return;
            }
            let new_hash = hash(&input.new_password, DEFAULT_COST).unwrap();
            sqlx::query("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
                .bind(&new_hash).bind(auth.user_id).execute(pool).await.ok();
            res.render(ok(()));
        }
        Err(_) => res.render(err(404, "user not found", ())),
    }
}

#[handler]
pub async fn get_user(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let id: i64 = match req.param("id").and_then(|s: &str| s.parse().ok()) { Some(v) => v, None => { res.render(err(400, "invalid id", ())); return; } };
    let pool = depot.obtain::<SqlitePool>().unwrap();
    match sqlx::query("SELECT * FROM users WHERE id = ?").bind(id).fetch_one(pool).await {
        Ok(r) => res.render(ok(UserResponse::from_row(&r))),
        Err(_) => res.render(err(404, "user not found", ())),
    }
}
