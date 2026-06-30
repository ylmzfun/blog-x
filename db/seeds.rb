# Admin user for ActiveAdmin
AdminUser.find_or_create_by!(email: "admin@example.com") do |u|
  u.password = "password"
  u.password_confirmation = "password"
end

# Users
admin = User.find_or_create_by!(email: "admin@blog.local") do |u|
  u.username = "admin"
  u.password = "password123"
  u.role = "admin"
  u.bio = "Blog administrator"
  u.email_verified = true
end

author = User.find_or_create_by!(email: "author@blog.local") do |u|
  u.username = "author"
  u.password = "password123"
  u.role = "author"
  u.bio = "A passionate writer"
  u.email_verified = true
end

reader = User.find_or_create_by!(email: "reader@blog.local") do |u|
  u.username = "reader"
  u.password = "password123"
  u.role = "user"
  u.email_verified = true
end

# Categories
tech = Category.find_or_create_by!(name: "Technology") do |c|
  c.slug = "technology"
  c.description = "Tech articles and tutorials"
end

life = Category.find_or_create_by!(name: "Lifestyle") do |c|
  c.slug = "lifestyle"
  c.description = "Life, health, and wellness"
end

code = Category.find_or_create_by!(name: "Programming") do |c|
  c.slug = "programming"
  c.description = "Programming tips and best practices"
end

# Tags
ruby_tag = Tag.find_or_create_by!(name: "Ruby") { |t| t.slug = "ruby" }
rails_tag = Tag.find_or_create_by!(name: "Rails") { |t| t.slug = "rails" }
js_tag = Tag.find_or_create_by!(name: "JavaScript") { |t| t.slug = "javascript" }
css_tag = Tag.find_or_create_by!(name: "CSS") { |t| t.slug = "css" }
sqlite_tag = Tag.find_or_create_by!(name: "SQLite") { |t| t.slug = "sqlite" }
api_tag = Tag.find_or_create_by!(name: "API") { |t| t.slug = "api" }

# Posts
post1 = Post.find_or_create_by!(title: "Getting Started with Ruby on Rails") do |p|
  p.slug = "getting-started-with-ruby-on-rails"
  p.content = <<~MD
    # Getting Started with Ruby on Rails

    Rails is a web application framework written in Ruby. It follows the MVC (Model-View-Controller) architecture pattern.

    ## Why Rails?

    - **Convention over Configuration**: Rails makes assumptions about what you need
    - **DRY**: Don't Repeat Yourself
    - **Active Record**: Powerful ORM for database interactions

    ## Installation

    ```bash
    gem install rails
    rails new myapp
    ```

    ## Your First Controller

    ```ruby
    class PostsController < ApplicationController
      def index
        @posts = Post.all
      end
    end
    ```

    Rails makes web development productive and fun!
  MD
  p.summary = "A comprehensive guide to getting started with Ruby on Rails, covering installation, MVC architecture, and your first controller."
  p.status = "published"
  p.published_at = 2.days.ago
  p.view_count = 156
  p.comment_count = 3
  p.category = tech
  p.author = admin
end
post1.tags << [ ruby_tag, rails_tag ]

post2 = Post.find_or_create_by!(title: "Understanding SQLite for Production") do |p|
  p.slug = "understanding-sqlite-for-production"
  p.content = <<~MD
    # Understanding SQLite for Production

    SQLite is often dismissed as a "toy database", but it's incredibly capable for many production workloads.

    ## Strengths

    1. **Zero Configuration**: No server process, no setup
    2. **Single File**: Easy backup and replication
    3. **Full SQL Support**: Most SQL features including window functions
    4. **WAL Mode**: Concurrent reads without blocking

    ## When to Use SQLite

    - Personal blogs and small websites
    - Desktop applications
    - Embedded systems
    - Development and testing

    ## Performance Tips

    ```sql
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    PRAGMA cache_size=-64000;
    ```

    For many applications, SQLite in WAL mode can handle thousands of requests per minute.
  MD
  p.summary = "Why SQLite is more capable than you think for production environments, with performance tips and best practices."
  p.status = "published"
  p.published_at = 1.day.ago
  p.view_count = 89
  p.comment_count = 2
  p.category = tech
  p.author = author
end
post2.tags << [ sqlite_tag, rails_tag ]

post3 = Post.find_or_create_by!(title: "Building REST APIs with Rails 7") do |p|
  p.slug = "building-rest-apis-with-rails-7"
  p.content = <<~MD
    # Building REST APIs with Rails 7

    Rails 7 makes API development easier than ever with `ActionController::API`.

    ## Setting Up an API Controller

    ```ruby
    class Api::V1::PostsController < ActionController::API
      before_action :authenticate

      def index
        posts = Post.all
        render json: posts
      end
    end
    ```

    ## Authentication with JWT

    Use the `jwt` gem for token-based authentication. Generate access tokens with short expiration and refresh tokens for long-lived sessions.

    ## Response Format

    Always return consistent JSON responses:

    ```json
    {
      "code": 0,
      "message": "success",
      "data": { ... }
    }
    ```

    This consistency makes frontend development much smoother.
  MD
  p.summary = "Learn how to build clean, secure REST APIs with Rails 7 using JWT authentication and consistent response formats."
  p.status = "published"
  p.published_at = 12.hours.ago
  p.view_count = 234
  p.comment_count = 5
  p.category = code
  p.author = author
end
post3.tags << [ rails_tag, api_tag, ruby_tag ]

post4 = Post.find_or_create_by!(title: "Modern CSS Techniques You Should Know") do |p|
  p.slug = "modern-css-techniques"
  p.content = <<~MD
    # Modern CSS Techniques You Should Know

    CSS has evolved tremendously. Here are some modern techniques that will level up your styling game.

    ## Container Queries

    ```css
    .card {
      container-type: inline-size;
    }

    @container (min-width: 400px) {
      .card-title {
        font-size: 1.5rem;
      }
    }
    ```

    ## CSS Nesting

    ```css
    .article {
      & h2 {
        color: var(--heading-color);
      }

      & p {
        line-height: 1.6;
      }
    }
    ```

    ## :has() Selector

    The parent selector we've always wanted:

    ```css
    .card:has(img) {
      grid-template-rows: auto 1fr;
    }
    ```

    These features are supported in all modern browsers!
  MD
  p.summary = "Explore modern CSS features including container queries, nesting, and the :has() selector with practical examples."
  p.status = "published"
  p.published_at = 6.hours.ago
  p.view_count = 67
  p.comment_count = 0
  p.category = tech
  p.author = admin
end
post4.tags << [ css_tag, js_tag ]

post5 = Post.find_or_create_by!(title: "Draft: Upcoming Features") do |p|
  p.slug = "draft-upcoming-features"
  p.content = "Work in progress... This is a draft post about upcoming features."
  p.summary = "Preview of upcoming features"
  p.status = "draft"
  p.category = tech
  p.author = admin
end

# Comments
Comment.find_or_create_by!(post: post1, author: reader, content: "Great introduction to Rails! Looking forward to more content.") do |c|
  c.status = "approved"
end

parent_comment = Comment.find_or_create_by!(post: post1, author: author, content: "Thanks! Let me know if you have any specific topics you'd like covered.") do |c|
  c.status = "approved"
end

Comment.find_or_create_by!(post: post1, author: reader, content: "Could you do a tutorial on authentication?") do |c|
  c.parent = parent_comment
  c.status = "approved"
end

Comment.find_or_create_by!(post: post3, author: reader, content: "JWT auth explained very clearly, thanks!") do |c|
  c.status = "approved"
end

Comment.find_or_create_by!(post: post3, author: admin, content: "Great point about consistent error responses. That saves so much frontend work.") do |c|
  c.status = "approved"
end

# Update post_count for categories and tags
[ tech, life, code ].each(&:recalculate_post_count!)
[ ruby_tag, rails_tag, js_tag, css_tag, sqlite_tag, api_tag ].each(&:recalculate_post_count!)

puts "Seed data created successfully!"
puts "  Admin user: admin@blog.local / password123 (role: admin)"
puts "  Author user: author@blog.local / password123 (role: author)"
puts "  Reader user: reader@blog.local / password123 (role: user)"
puts "  ActiveAdmin: admin@example.com / password"

# Rebuild FTS index
ActiveRecord::Base.connection.execute(
  "INSERT INTO posts_fts(rowid, title, content) SELECT id, title, content FROM posts WHERE status = 'published' AND deleted_at IS NULL"
)
puts "FTS index rebuilt"
