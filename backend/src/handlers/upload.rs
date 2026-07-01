use salvo::prelude::*;
use uuid::Uuid;
use serde::Serialize;
use sqlx::SqlitePool;

use crate::response::{ok, err};
use crate::utils::jwt::get_auth;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadResponse { url: String }

#[handler]
pub async fn upload_image(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let _auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let file = match req.file("file").await { Some(f) => f, None => { res.render(err(400, "no file", ())); return; } };

    let ext = file.name()
        .and_then(|n| n.rsplit('.').next())
        .unwrap_or("png")
        .to_lowercase();
    if !["jpg","jpeg","png","gif","webp","svg"].contains(&ext.as_str()) {
        res.render(err(400, "unsupported type", ()));
        return;
    }

    let uploads = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".into());
    std::fs::create_dir_all(&uploads).ok();
    let fname = format!("{}.{}", Uuid::new_v4(), ext);
    let dest = format!("{}/{}", uploads, fname);

    // Salvo 0.72 FilePart — path() returns &PathBuf
    let src = file.path();
    std::fs::copy(src, &dest).ok();

    let base = std::env::var("BASE_URL").unwrap_or_default();
    res.render(ok(UploadResponse { url: format!("{}/uploads/{}", base, fname) }));
}

#[handler]
pub async fn upload_avatar(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    let auth = match get_auth(depot) { Some(a) => a.clone(), None => { res.render(err(401, "unauthorized", ())); return; } };
    let file = match req.file("file").await { Some(f) => f, None => { res.render(err(400, "no file", ())); return; } };

    let ext = file.name()
        .and_then(|n| n.rsplit('.').next())
        .unwrap_or("png")
        .to_lowercase();
    if !["jpg","jpeg","png","webp"].contains(&ext.as_str()) {
        res.render(err(400, "unsupported type", ()));
        return;
    }

    let uploads = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".into());
    let avatar_dir = format!("{}/avatars", uploads);
    std::fs::create_dir_all(&avatar_dir).ok();
    let fname = format!("{}.{}", Uuid::new_v4(), ext);
    let dest = format!("{}/{}", avatar_dir, fname);

    let src = file.path();
    std::fs::copy(src, &dest).ok();

    let base = std::env::var("BASE_URL").unwrap_or_default();
    let url = format!("{}/uploads/avatars/{}", base, fname);

    let pool = depot.obtain::<SqlitePool>().unwrap();
    sqlx::query("UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(&url).bind(auth.user_id).execute(pool).await.ok();

    res.render(ok(UploadResponse { url }));
}
