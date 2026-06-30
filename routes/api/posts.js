const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { slugify, uniqueSlug } = require('../../utils/slug');
const { success, paginated, badRequest, notFound, forbidden } = require('../../utils/response');
const { authenticate, optionalAuth, requireAuthor, requireAdmin } = require('../../middleware/auth');
const { validate, postRules, paginationRules } = require('../../utils/validators');

const router = express.Router();

// GET /api/posts - Article list
router.get('/', optionalAuth, paginationRules, validate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);
  const offset = (page - 1) * pageSize;
  const { categorySlug, tagSlug, status, sort, pinned } = req.query;

  let where = ['p.deleted_at IS NULL'];
  let joins = [];
  const params = [];

  // Non-admin users only see published posts
  const isAdmin = req.user && req.user.role === 'admin';
  if (isAdmin && status) {
    where.push('p.status = ?');
    params.push(status);
  } else {
    where.push("p.status = 'published'");
  }

  if (categorySlug) {
    joins.push('LEFT JOIN categories c ON p.category_id = c.id');
    where.push('c.slug = ?');
    params.push(categorySlug);
  }

  if (tagSlug) {
    joins.push('LEFT JOIN post_tags pt ON p.id = pt.post_id');
    joins.push('LEFT JOIN tags t ON pt.tag_id = t.id');
    where.push('t.slug = ?');
    params.push(tagSlug);
  }

  if (pinned === 'true') {
    where.push('p.pinned = 1');
  }

  const orderBy = sort === 'popular' ? 'ORDER BY p.view_count DESC, p.created_at DESC' : 'ORDER BY p.pinned DESC, p.published_at DESC, p.created_at DESC';

  const joinStr = [...new Set(joins)].join(' ');
  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const countSql = `SELECT COUNT(DISTINCT p.id) as total FROM posts p ${joinStr} ${whereStr}`;
  const total = db.prepare(countSql).get(...params).total;

  const dataSql = `
    SELECT DISTINCT p.id, p.title, p.slug, p.summary, p.cover, p.author_id,
           p.category_id, p.view_count, p.comment_count, p.pinned, p.status,
           p.published_at, p.created_at
    FROM posts p ${joinStr} ${whereStr}
    ${orderBy} LIMIT ? OFFSET ?
  `;

  const posts = db.prepare(dataSql).all(...params, pageSize, offset);

  const list = posts.map(p => {
    const author = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(p.author_id);
    const category = p.category_id ? db.prepare('SELECT id, name, slug FROM categories WHERE id = ?').get(p.category_id) : null;
    const tags = db.prepare(`
      SELECT t.id, t.name, t.slug FROM tags t
      INNER JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).all(p.id);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      cover: p.cover,
      author: author || null,
      category: category || null,
      tags,
      viewCount: p.view_count,
      commentCount: p.comment_count,
      pinned: !!p.pinned,
      status: p.status,
      publishedAt: p.published_at,
      createdAt: p.created_at,
    };
  });

  paginated(res, list, total, page, pageSize);
});

// GET /api/posts/drafts - Draft list (author only)
router.get('/drafts', authenticate, requireAuthor, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);
  const offset = (page - 1) * pageSize;

  let where = "p.deleted_at IS NULL AND p.status = 'draft'";
  const params = [];

  // Authors only see their own drafts; admins see all
  if (req.user.role !== 'admin') {
    where += ' AND p.author_id = ?';
    params.push(req.user.id);
  }

  const total = db.prepare(`SELECT COUNT(*) as total FROM posts p WHERE ${where}`).get(...params).total;

  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.summary, p.cover, p.author_id,
           p.category_id, p.view_count, p.comment_count, p.pinned, p.status,
           p.published_at, p.created_at
    FROM posts p WHERE ${where}
    ORDER BY p.updated_at DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  const list = posts.map(p => {
    const author = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(p.author_id);
    const category = p.category_id ? db.prepare('SELECT id, name, slug FROM categories WHERE id = ?').get(p.category_id) : null;
    const tags = db.prepare(`
      SELECT t.id, t.name, t.slug FROM tags t
      INNER JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?
    `).all(p.id);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      cover: p.cover,
      author: author || null,
      category: category || null,
      tags,
      viewCount: p.view_count,
      commentCount: p.comment_count,
      pinned: !!p.pinned,
      status: p.status,
      publishedAt: p.published_at,
      createdAt: p.created_at,
    };
  });

  paginated(res, list, total, page, pageSize);
});

// GET /api/posts/:slug - Article detail
router.get('/:slug', optionalAuth, (req, res) => {
  const post = db.prepare(`
    SELECT * FROM posts WHERE slug = ? AND deleted_at IS NULL
  `).get(req.params.slug);

  if (!post) return notFound(res, 'Post not found');

  // Non-admin users can't see drafts
  const isAdmin = req.user && req.user.role === 'admin';
  if (post.status === 'draft' && !isAdmin) {
    return notFound(res, 'Post not found');
  }

  // Increment view count (only for published posts)
  if (post.status === 'published') {
    db.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(post.id);
  }

  const author = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(post.author_id);
  const category = post.category_id ? db.prepare('SELECT id, name, slug FROM categories WHERE id = ?').get(post.category_id) : null;
  const tags = db.prepare(`
    SELECT t.id, t.name, t.slug FROM tags t
    INNER JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?
  `).all(post.id);

  // Previous post
  const prevPost = db.prepare(`
    SELECT title, slug FROM posts
    WHERE deleted_at IS NULL AND status = 'published' AND published_at < ?
    ORDER BY published_at DESC LIMIT 1
  `).get(post.published_at || post.created_at);

  // Next post
  const nextPost = db.prepare(`
    SELECT title, slug FROM posts
    WHERE deleted_at IS NULL AND status = 'published' AND published_at > ?
    ORDER BY published_at ASC LIMIT 1
  `).get(post.published_at || post.created_at);

  success(res, {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    summary: post.summary,
    cover: post.cover,
    author: author || null,
    category: category || null,
    tags,
    viewCount: post.view_count,
    commentCount: post.comment_count,
    pinned: !!post.pinned,
    status: post.status,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    prevPost: prevPost || null,
    nextPost: nextPost || null,
  });
});

// POST /api/posts - Create post
router.post('/', authenticate, requireAuthor, postRules, validate, (req, res) => {
  const { title, content, summary, cover, categoryId, tagIds, status } = req.body;

  const existsFn = (slug) => {
    const r = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
    return Promise.resolve(!!r);
  };

  uniqueSlug(req.body.slug || title, existsFn).then(slug => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const publishedAt = status === 'published' ? now : null;

    db.prepare(`
      INSERT INTO posts (id, title, slug, content, summary, cover, author_id, category_id, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, slug, content || '', summary || '', cover || '', req.user.id, categoryId || null, status || 'draft', publishedAt);

    // Update category post count
    if (categoryId && status === 'published') {
      db.prepare('UPDATE categories SET post_count = post_count + 1 WHERE id = ?').run(categoryId);
    }

    // Associate tags
    if (tagIds && Array.isArray(tagIds)) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
      for (const tagId of tagIds) {
        insertTag.run(id, tagId);
        if (status === 'published') {
          db.prepare('UPDATE tags SET post_count = post_count + 1 WHERE id = ?').run(tagId);
        }
      }
    }

    success(res, { id, slug }, 'Post created', 201);
  });
});

// PUT /api/posts/:id - Update post
router.put('/:id', authenticate, requireAuthor, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!post) return notFound(res, 'Post not found');

  // Only author or admin can edit
  if (post.author_id !== req.user.id && req.user.role !== 'admin') {
    return forbidden(res, 'You can only edit your own posts');
  }

  const { title, slug, content, summary, cover, categoryId, tagIds, status } = req.body;

  const wasPublished = post.status === 'published';
  const willBePublished = status === 'published' || (post.status === 'published' && status === undefined);

  const newSlug = slug || post.slug;
  const newTitle = title || post.title;
  const newContent = content !== undefined ? content : post.content;
  const newSummary = summary !== undefined ? summary : post.summary;
  const newCover = cover !== undefined ? cover : post.cover;
  const newCategoryId = categoryId !== undefined ? categoryId : post.category_id;
  const newStatus = status || post.status;

  // Handle category post count changes
  if (post.category_id && post.category_id !== newCategoryId && wasPublished) {
    db.prepare('UPDATE categories SET post_count = MAX(0, post_count - 1) WHERE id = ?').run(post.category_id);
  }
  if (newCategoryId && (!wasPublished || newCategoryId !== post.category_id) && willBePublished) {
    db.prepare('UPDATE categories SET post_count = post_count + 1 WHERE id = ?').run(newCategoryId);
  }

  // Handle status transition
  let publishedAt = post.published_at;
  if (!wasPublished && newStatus === 'published') {
    publishedAt = new Date().toISOString();
  }

  db.prepare(`
    UPDATE posts SET
      title = ?, slug = ?, content = ?, summary = ?, cover = ?,
      category_id = ?, status = ?, published_at = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newSlug, newContent, newSummary, newCover, newCategoryId, newStatus, publishedAt, post.id);

  // Update tags
  if (tagIds && Array.isArray(tagIds)) {
    // Remove old tag counts
    if (wasPublished) {
      const oldTags = db.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?').all(post.id);
      for (const t of oldTags) {
        db.prepare('UPDATE tags SET post_count = MAX(0, post_count - 1) WHERE id = ?').run(t.tag_id);
      }
    }
    db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(post.id);

    const insertTag = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      insertTag.run(post.id, tagId);
      if (willBePublished) {
        db.prepare('UPDATE tags SET post_count = post_count + 1 WHERE id = ?').run(tagId);
      }
    }
  }

  success(res, { id: post.id, slug: newSlug }, 'Post updated');
});

// DELETE /api/posts/:id - Soft delete
router.delete('/:id', authenticate, requireAuthor, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!post) return notFound(res, 'Post not found');

  if (post.author_id !== req.user.id && req.user.role !== 'admin') {
    return forbidden(res, 'You can only delete your own posts');
  }

  db.prepare('UPDATE posts SET deleted_at = datetime(\'now\') WHERE id = ?').run(post.id);

  // Decrement category count
  if (post.category_id && post.status === 'published') {
    db.prepare('UPDATE categories SET post_count = MAX(0, post_count - 1) WHERE id = ?').run(post.category_id);
  }

  // Decrement tag counts
  if (post.status === 'published') {
    const tags = db.prepare('SELECT tag_id FROM post_tags WHERE post_id = ?').all(post.id);
    for (const t of tags) {
      db.prepare('UPDATE tags SET post_count = MAX(0, post_count - 1) WHERE id = ?').run(t.tag_id);
    }
  }

  success(res, null, 'Post deleted');
});

// PUT /api/posts/:id/pin - Pin/unpin post (admin only)
router.put('/:id/pin', authenticate, requireAdmin, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!post) return notFound(res, 'Post not found');

  const newPinned = post.pinned ? 0 : 1;
  db.prepare('UPDATE posts SET pinned = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newPinned, post.id);

  success(res, { pinned: !!newPinned }, newPinned ? 'Post pinned' : 'Post unpinned');
});

module.exports = router;
