# Blog Rail

一个基于 Ruby on Rails 7 + SQLite 的轻量级博客系统，内置 ActiveAdmin 后台管理面板。

---

## 技术架构

| 层级 | 技术 |
|------|------|
| 语言 | Ruby 3.1 |
| 框架 | Rails 7.2 |
| 数据库 | SQLite 3（via sqlite3 gem ~> 2.1） |
| 前端 | Importmap + Turbo + Stimulus（Hotwire） |
| 后台管理 | ActiveAdmin 3.4 |
| 认证 | Devise 4.9（仅管理员） |
| 样式 | Sprockets + 原生 CSS |
| Web 服务器 | Puma |

### 目录结构（关键部分）

```
app/
├── controllers/
│   └── posts_controller.rb      # 公开博客：index / show
├── models/
│   ├── post.rb                  # 文章模型
│   └── admin_user.rb            # 管理员模型（Devise）
├── views/
│   ├── layouts/application.html.erb
│   └── posts/
│       ├── index.html.erb       # 文章列表
│       └── show.html.erb        # 文章详情
├── assets/stylesheets/
│   └── blog.css                 # 博客样式
└── admin/
    ├── posts.rb                 # ActiveAdmin 文章管理
    └── admin_users.rb           # ActiveAdmin 用户管理
config/
├── routes.rb                    # 路由配置
└── database.yml                 # SQLite 数据库配置
db/
├── migrate/                     # 数据库迁移文件
└── seeds.rb                     # 初始数据
```

---

## 设计思想

**职责分离**：公开博客（`PostsController`）与后台管理（ActiveAdmin）完全独立。访客只能读取文章，管理员通过 `/admin` 进行 CRUD 操作，两套界面互不干扰。

**最小依赖**：选用 SQLite 作为数据库，无需额外安装数据库服务，开箱即用，适合个人博客、内容量不大的场景。前端使用 Rails 原生 Importmap，不引入 Node 构建流程。

**Hotwire 优先**：集成 Turbo + Stimulus，页面跳转无刷新，交互体验接近 SPA，但无需编写 JavaScript。

**安全默认**：管理后台由 Devise 保护，所有写操作需登录。公开路由仅暴露 `GET /posts` 和 `GET /posts/:id`，不对外开放任何写入接口。

---

## 数据模型

```
posts
  id         integer  PK
  title      string
  body       text
  created_at datetime
  updated_at datetime

admin_users
  id                     integer  PK
  email                  string   unique
  encrypted_password     string
  reset_password_token   string
  created_at             datetime
  updated_at             datetime
```

---

## 快速开始

### 环境要求

- Ruby 3.1+
- Bundler 2+

### 安装

```bash
git clone <repo-url>
cd blog-rail
bundle install
```

### 初始化数据库

```bash
bin/rails db:create db:migrate db:seed
```

seed 会创建：
- 管理员账号：`admin@example.com` / `password`
- 2 篇示例文章

### 启动服务

```bash
bin/rails server
```

访问地址：
- 博客首页：http://localhost:3000
- 管理后台：http://localhost:3000/admin

---

## 使用流程

### 读者

1. 打开 http://localhost:3000 查看文章列表
2. 点击文章标题或「Read more →」进入详情页
3. 详情页点击「← Back to posts」返回列表

### 管理员

1. 访问 http://localhost:3000/admin
2. 使用邮箱和密码登录
3. 在「Posts」菜单中新建、编辑或删除文章
4. 文章保存后立即在公开博客展示

---

## 开发命令

```bash
# 运行测试
bin/rails test

# 查看所有路由
bin/rails routes

# 进入数据库控制台
bin/rails dbconsole

# 进入 Rails 控制台
bin/rails console

# 代码安全扫描
bundle exec brakeman
```

---

## 部署说明

SQLite 适合单机部署。生产环境建议：

1. 设置 `RAILS_ENV=production`
2. 预编译静态资源：`bin/rails assets:precompile`
3. 初始化生产数据库：`bin/rails db:migrate RAILS_ENV=production`
4. 使用 Puma 或反向代理（Nginx）对外提供服务
5. 定期备份 `db/production.sqlite3` 文件

如需迁移到 PostgreSQL / MySQL，只需替换 Gemfile 中的数据库 gem 并更新 `config/database.yml`，业务代码无需改动。
