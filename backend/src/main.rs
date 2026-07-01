mod models;
mod handlers;
mod middleware;
mod utils;
mod response;
mod db;

use salvo::prelude::*;
use salvo::cors::{Cors, AllowOrigin, AllowMethods, AllowHeaders};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_env_filter("info").init();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:blog.db?mode=rwc".into());
    let pool = db::init_pool(&db_url).await;
    db::run_migrations(&pool).await;
    tracing::info!("Database ready");

    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".into());
    std::fs::create_dir_all(&upload_dir).ok();

    let cors = Cors::new()
        .allow_origin(AllowOrigin::any())
        .allow_methods(AllowMethods::any())
        .allow_headers(AllowHeaders::any())
        .into_handler();

    let router = Router::new()
        .hoop(cors)
        .hoop(Logger::new())
        .hoop(salvo::affix_state::inject(pool))
        .hoop(middleware::rate_limit::rate_limit_middleware)
        // Static uploads
        .push(Router::with_path("uploads/<**path>").get(
            salvo::serve_static::StaticDir::new(vec![upload_dir])
        ))
        // Auth — public
        .push(
            Router::with_path("api/auth")
                .push(Router::with_path("register").post(handlers::auth::register))
                .push(Router::with_path("login").post(handlers::auth::login))
                .push(Router::with_path("refresh").post(handlers::auth::refresh))
                .push(Router::with_path("logout").post(handlers::auth::logout))
        )
        // User
        .push(
            Router::with_path("api/users")
                .push(Router::with_path("me").hoop(utils::jwt::auth_middleware).get(handlers::user::get_me))
                .push(Router::with_path("me").hoop(utils::jwt::auth_middleware).put(handlers::user::update_me))
                .push(Router::with_path("me/password").hoop(utils::jwt::auth_middleware).put(handlers::user::change_password))
                .push(Router::with_path("<id>").get(handlers::user::get_user))
        )
        // Posts
        .push(
            Router::with_path("api/posts")
                .push(Router::with_path("").get(handlers::post::list_posts))
                .push(Router::with_path("").hoop(utils::jwt::auth_middleware).post(handlers::post::create_post))
                .push(Router::with_path("drafts").hoop(utils::jwt::auth_middleware).get(handlers::post::list_drafts))
                .push(Router::with_path("<postId>/comments").get(handlers::comment::list_comments))
                .push(Router::with_path("<postId>/comments").hoop(utils::jwt::auth_middleware).post(handlers::comment::create_comment))
                .push(Router::with_path("<param>").get(handlers::post::get_post))
                .push(Router::with_path("<param>").hoop(utils::jwt::auth_middleware).put(handlers::post::update_post))
                .push(Router::with_path("<param>").hoop(utils::jwt::auth_middleware).delete(handlers::post::delete_post))
                .push(Router::with_path("<param>/pin").hoop(utils::jwt::auth_middleware).put(handlers::post::toggle_pin))
        )
        // Categories
        .push(
            Router::with_path("api/categories")
                .push(Router::with_path("").get(handlers::category::list_categories))
                .push(Router::with_path("").hoop(utils::jwt::auth_middleware).post(handlers::category::create_category))
                .push(Router::with_path("<param>").get(handlers::category::get_category))
                .push(Router::with_path("<param>").hoop(utils::jwt::auth_middleware).put(handlers::category::update_category))
                .push(Router::with_path("<param>").hoop(utils::jwt::auth_middleware).delete(handlers::category::delete_category))
        )
        // Tags
        .push(
            Router::with_path("api/tags")
                .push(Router::with_path("").get(handlers::tag::list_tags))
                .push(Router::with_path("").hoop(utils::jwt::auth_middleware).post(handlers::tag::create_tag))
                .push(Router::with_path("<id>").hoop(utils::jwt::auth_middleware).delete(handlers::tag::delete_tag))
        )
        // Comments — standalone
        .push(
            Router::with_path("api/comments")
                .push(Router::with_path("<id>").hoop(utils::jwt::auth_middleware).delete(handlers::comment::delete_comment))
                .push(Router::with_path("<id>/approve").hoop(utils::jwt::auth_middleware).put(handlers::comment::approve_comment))
        )
        // Search
        .push(
            Router::with_path("api/search")
                .push(Router::with_path("").get(handlers::search::search))
                .push(Router::with_path("suggestions").get(handlers::search::suggestions))
        )
        // Stats
        .push(
            Router::with_path("api/stats")
                .push(Router::with_path("overview").get(handlers::stats::overview))
                .push(Router::with_path("posts/top").get(handlers::stats::top_posts))
        )
        // Upload
        .push(
            Router::with_path("api/upload")
                .push(Router::with_path("image").hoop(utils::jwt::auth_middleware).post(handlers::upload::upload_image))
                .push(Router::with_path("avatar").hoop(utils::jwt::auth_middleware).post(handlers::upload::upload_avatar))
        );

    let port: u16 = std::env::var("PORT").unwrap_or_else(|_| "3000".into()).parse().unwrap_or(3000);
    let addr = format!("0.0.0.0:{}", port);
    tracing::info!("Listening on {}", addr);
    let acceptor = TcpListener::new(&addr).bind().await;
    Server::new(acceptor).serve(router).await;
}
