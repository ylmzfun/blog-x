# 博客网站需求文档

## 1. 项目概述

个人/团队博客网站，支持文章发布、分类管理、评论互动和全文搜索, 使用sqlite存储。

---

## 2. 功能需求

### 2.1 用户模块

| 功能 | 描述 | 角色 |
|------|------|------|
| 注册 | 邮箱+密码注册，邮箱验证 | 访客 |
| 登录 | 邮箱/用户名+密码，返回 JWT | 访客 |
| 退出登录 | 使 token 失效 | 已登录用户 |
| 查看个人信息 | 头像、昵称、简介、社交链接 | 已登录用户 |
| 修改个人信息 | 昵称、头像、简介 | 已登录用户 |
| 修改密码 | 旧密码验证后更新 | 已登录用户 |
| 忘记密码 | 邮件重置链接 | 访客 |

### 2.2 文章模块

| 功能 | 描述 | 角色 |
|------|------|------|
| 文章列表 | 分页、按时间/热度排序 | 所有人 |
| 文章详情 | Markdown 渲染、阅读量+1 | 所有人 |
| 创建文章 | 标题、内容(Markdown)、分类、标签、封面、状态(草稿/发布) | 管理员/作者 |
| 编辑文章 | 修改所有字段 | 作者/管理员 |
| 删除文章 | 软删除 | 作者/管理员 |
| 置顶文章 | 首页置顶展示 | 管理员 |
| 草稿箱 | 查看/管理草稿 | 作者 |

### 2.3 分类模块

| 功能 | 描述 | 角色 |
|------|------|------|
| 分类列表 | 含各分类文章数 | 所有人 |
| 按分类查文章 | 分页列表 | 所有人 |
| 创建/编辑/删除分类 | 名称、slug、描述 | 管理员 |

### 2.4 标签模块

| 功能 | 描述 | 角色 |
|------|------|------|
| 标签云 | 含各标签文章数 | 所有人 |
| 按标签查文章 | 分页列表 | 所有人 |
| 创建/删除标签 | 名称、slug | 管理员/作者 |

### 2.5 评论模块

| 功能 | 描述 | 角色 |
|------|------|------|
| 查看评论 | 树状结构，分页 | 所有人 |
| 发布评论 | 支持回复楼层 | 已登录用户 |
| 删除评论 | 自己的评论或管理员 | 已登录用户/管理员 |
| 评论审核 | 开启后需审核才显示 | 管理员 |

### 2.6 搜索模块

| 功能 | 描述 |
|------|------|
| 全文搜索 | 搜索文章标题+内容，高亮关键词 |
| 搜索建议 | 输入时实时提示 |

### 2.7 统计模块（管理后台）

- 文章数、评论数、用户数、今日 PV/UV
- 文章阅读量排行榜

---

## 3. 非功能需求

- **认证**：JWT（Access Token 2h + Refresh Token 7d）
- **分页**：统一使用 `page` + `pageSize`，默认 pageSize=10
- **响应格式**：统一 JSON 结构（见下方）
- **SEO**：文章页 SSR 或预渲染，支持 Open Graph meta
- **安全**：XSS 过滤（Markdown 输入）、Rate Limiting（登录/评论接口）
- **图片**：封面/头像支持上传至 OSS 或本地存储

---

## 4. 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

分页响应的 `data` 结构：

```json
{
  "list": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

错误码：

| code | 含义 |
|------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录/token 失效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 5. API 接口定义

### 5.1 认证

```
POST   /api/auth/register          注册
POST   /api/auth/login             登录
POST   /api/auth/logout            退出登录（需 token）
POST   /api/auth/refresh           刷新 token
POST   /api/auth/forgot-password   发送重置邮件
POST   /api/auth/reset-password    重置密码
```

### 5.2 用户

```
GET    /api/users/me               获取当前用户信息
PUT    /api/users/me               更新当前用户信息
PUT    /api/users/me/password      修改密码
GET    /api/users/:id              获取用户公开信息
POST   /api/upload/avatar          上传头像
```

### 5.3 文章

```
GET    /api/posts                  文章列表
GET    /api/posts/:slug            文章详情（by slug）
POST   /api/posts                  创建文章（需认证）
PUT    /api/posts/:id              更新文章（需认证）
DELETE /api/posts/:id              删除文章（需认证）
GET    /api/posts/drafts           草稿列表（需认证）
PUT    /api/posts/:id/pin          置顶/取消置顶（需管理员）
```

### 5.4 分类

```
GET    /api/categories             分类列表（含文章数）
GET    /api/categories/:slug       分类详情
POST   /api/categories             创建分类（管理员）
PUT    /api/categories/:id         更新分类（管理员）
DELETE /api/categories/:id         删除分类（管理员）
```

### 5.5 标签

```
GET    /api/tags                   标签列表（含文章数）
POST   /api/tags                   创建标签（作者+）
DELETE /api/tags/:id               删除标签（管理员）
```

### 5.6 评论

```
GET    /api/posts/:postId/comments     文章评论列表
POST   /api/posts/:postId/comments     发布评论（需认证）
DELETE /api/comments/:id               删除评论（需认证）
PUT    /api/comments/:id/approve       审核评论（管理员）
```

### 5.7 搜索

```
GET    /api/search                 全文搜索
GET    /api/search/suggestions     搜索建议
```

### 5.8 统计（管理员）

```
GET    /api/stats/overview         总览数据
GET    /api/stats/posts/top        文章阅读排行
```

### 5.9 文件上传

```
POST   /api/upload/image           上传图片（文章封面/内容图）
POST   /api/upload/avatar          上传头像
```

---

## 6. 数据模型

### User
```
id, username, email, passwordHash, avatar, bio, website,
role(admin|author|user), emailVerified, createdAt, updatedAt
```

### Post
```
id, title, slug(unique), content, summary, cover,
authorId, categoryId, status(published|draft), pinned,
viewCount, commentCount, publishedAt, createdAt, updatedAt, deletedAt
```

### Category
```
id, name, slug(unique), description, postCount, createdAt, updatedAt
```

### Tag
```
id, name, slug(unique), postCount, createdAt
```

### PostTag（多对多关联）
```
postId, tagId
```

### Comment
```
id, postId, authorId, content, parentId,
status(approved|pending|rejected), createdAt, updatedAt, deletedAt
```

---

## 7. 前端页面路由（Blazor）

| 路由 | 页面 |
|------|------|
| `/` | 首页（文章列表） |
| `/post/{slug}` | 文章详情 |
| `/category/{slug}` | 分类文章列表 |
| `/tag/{slug}` | 标签文章列表 |
| `/search?q=` | 搜索结果 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/profile` | 个人中心 |
| `/admin` | 管理后台首页 |
| `/admin/posts` | 文章管理 |
| `/admin/posts/new` | 新建文章 |
| `/admin/posts/{id}/edit` | 编辑文章 |
| `/admin/categories` | 分类管理 |
| `/admin/comments` | 评论管理 |
| `/admin/stats` | 统计数据 |

---

*生成日期：2026-06-30*
