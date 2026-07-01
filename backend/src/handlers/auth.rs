use salvo::prelude::*;
use sqlx::SqlitePool;
use sqlx::Row;
use bcrypt::{hash, verify, DEFAULT_COST};

use crate::models::user::*;
use crate::response::{ok, err};
use crate::utils::jwt::{create_access_token, create_refresh_token, verify_token};

#[handler]
pub async fn register(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let input: RegisterInput = match req.parse_json().await {
        Ok(v) => v,
        Err(_) => { res.render(err(400, "invalid input", ())); return; }
    };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    // Check duplicate
    let exists = sqlx::query("SELECT id FROM users WHERE email = ? OR username = ?")
        .bind(&input.email).bind(&input.username)
        .fetch_optional(pool).await;
    if let Ok(Some(_)) = exists {
        res.render(err(400, "email or username already exists", ()));
        return;
    }

    let password_hash = hash(&input.password, DEFAULT_COST).unwrap();
    let _ = sqlx::query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
        .bind(&input.username).bind(&input.email).bind(&password_hash)
        .execute(pool).await;

    res.render(ok(()));
}

#[handler]
pub async fn login(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let input: LoginInput = match req.parse_json().await {
        Ok(v) => v,
        Err(_) => { res.render(err(400, "invalid input", ())); return; }
    };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let row = sqlx::query("SELECT * FROM users WHERE email = ? OR username = ?")
        .bind(&input.account).bind(&input.account)
        .fetch_optional(pool).await;

    let row = match row {
        Ok(Some(r)) => r,
        _ => { res.render(err(401, "invalid credentials", ())); return; }
    };

    let password_hash: String = row.get("password_hash");
    if !verify(&input.password, &password_hash).unwrap_or(false) {
        res.render(err(401, "invalid credentials", ())); return;
    }

    let user = UserResponse::from_row(&row);
    let user_id: i64 = row.get("id");
    let username: String = row.get("username");
    let role: String = row.get("role");

    let access_token = create_access_token(user_id, &username, &role).unwrap();
    let refresh_token_str = create_refresh_token(user_id, &username, &role).unwrap();

    sqlx::query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))")
        .bind(user_id).bind(&refresh_token_str)
        .execute(pool).await.ok();

    res.render(ok(LoginResponse { access_token, refresh_token: refresh_token_str, user }));
}

#[handler]
pub async fn logout(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let pool = depot.obtain::<SqlitePool>().unwrap();
    if let Some(token) = req.headers().get("Authorization").and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("Bearer ")) {
        sqlx::query("DELETE FROM refresh_tokens WHERE token = ?").bind(token).execute(pool).await.ok();
    }
    res.render(ok(()));
}

#[handler]
pub async fn refresh(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let input: RefreshInput = match req.parse_json().await {
        Ok(v) => v,
        Err(_) => { res.render(err(400, "invalid input", ())); return; }
    };
    let pool = depot.obtain::<SqlitePool>().unwrap();

    let stored = sqlx::query("SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')")
        .bind(&input.refresh_token)
        .fetch_optional(pool).await;

    if let Ok(Some(_)) = stored {
        let claims = match verify_token(&input.refresh_token) {
            Ok(c) if c.token_type == "refresh" => c,
            _ => { res.render(err(401, "invalid refresh token", ())); return; }
        };
        // Rotate
        sqlx::query("DELETE FROM refresh_tokens WHERE token = ?").bind(&input.refresh_token).execute(pool).await.ok();
        let access = create_access_token(claims.sub, &claims.username, &claims.role).unwrap();
        let new_refresh = create_refresh_token(claims.sub, &claims.username, &claims.role).unwrap();
        sqlx::query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))")
            .bind(claims.sub).bind(&new_refresh).execute(pool).await.ok();
        res.render(ok(TokenPair { access_token: access, refresh_token: new_refresh }));
    } else {
        res.render(err(401, "invalid or expired refresh token", ()));
    }
}
