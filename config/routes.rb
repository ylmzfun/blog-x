Rails.application.routes.draw do
  devise_for :admin_users, ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)

  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    # Auth
    post "auth/register", to: "auth#register"
    post "auth/login", to: "auth#login"
    post "auth/logout", to: "auth#logout"
    post "auth/refresh", to: "auth#refresh"
    post "auth/forgot-password", to: "auth#forgot_password"
    post "auth/reset-password", to: "auth#reset_password"

    # Users
    get "users/me", to: "users#me"
    put "users/me", to: "users#update"
    put "users/me/password", to: "users#update_password"
    get "users/:id", to: "users#show"

    # Upload
    post "upload/image", to: "upload#image"
    post "upload/avatar", to: "upload#avatar"

    # Posts
    get "posts", to: "posts#index"
    get "posts/drafts", to: "posts#drafts"
    get "posts/:slug", to: "posts#show"
    post "posts", to: "posts#create"
    put "posts/:id", to: "posts#update"
    delete "posts/:id", to: "posts#destroy"
    put "posts/:id/pin", to: "posts#pin"

    # Categories
    get "categories", to: "categories#index"
    get "categories/:slug", to: "categories#show"
    post "categories", to: "categories#create"
    put "categories/:id", to: "categories#update"
    delete "categories/:id", to: "categories#destroy"

    # Tags
    get "tags", to: "tags#index"
    post "tags", to: "tags#create"
    delete "tags/:id", to: "tags#destroy"

    # Comments
    get "posts/:postId/comments", to: "comments#index"
    post "posts/:postId/comments", to: "comments#create"
    delete "comments/:id", to: "comments#destroy"
    put "comments/:id/approve", to: "comments#approve"

    # Search
    get "search", to: "search#search"
    get "search/suggestions", to: "search#suggestions"

    # Stats
    get "stats/overview", to: "stats#overview"
    get "stats/posts/top", to: "stats#top_posts"
  end

  resources :posts, only: [ :index, :show ], param: :slug
  root "posts#index"
end
