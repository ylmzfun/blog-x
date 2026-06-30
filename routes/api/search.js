const express = require('express');
const db = require('../../db');
const { success, paginated, badRequest } = require('../../utils/response');
const { validate, paginationRules } = require('../../utils/validators');

const router = express.Router();

// GET /api/search - Full-text search
router.get('/', paginationRules, validate, (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return badRequest(res, 'Search query "q" is required');

  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);
  const offset = (page - 1) * pageSize;

  // Use FTS5 for full-text search
  const countSql = `
    SELECT COUNT(*) as total FROM posts_fts
    INNER JOIN posts p ON posts_fts.rowid = p.rowid
    WHERE posts_fts MATCH ? AND p.status = 'published' AND p.deleted_at IS NULL
  `;
  const total = db.prepare(countSql).get(q).total;

  const searchSql = `
    SELECT p.id, p.title, p.slug, p.summary, p.published_at,
           snippet(posts_fts, 1, '<mark>', '</mark>', '...', 40) as highlight
    FROM posts_fts
    INNER JOIN posts p ON posts_fts.rowid = p.rowid
    WHERE posts_fts MATCH ? AND p.status = 'published' AND p.deleted_at IS NULL
    ORDER BY rank
    LIMIT ? OFFSET ?
  `;

  let results;
  try {
    results = db.prepare(searchSql).all(q, pageSize, offset);
  } catch (err) {
    // If FTS query syntax is invalid, return empty
    return paginated(res, [], 0, page, pageSize);
  }

  const list = results.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    highlight: r.highlight,
    publishedAt: r.published_at,
  }));

  paginated(res, list, total, page, pageSize);
});

// GET /api/search/suggestions - Search suggestions
router.get('/suggestions', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return success(res, { suggestions: [] });
  }

  const suggestions = db.prepare(`
    SELECT DISTINCT title FROM posts
    WHERE status = 'published' AND deleted_at IS NULL AND title LIKE ?
    ORDER BY view_count DESC
    LIMIT 5
  `).all(`%${q}%`).map(r => r.title);

  success(res, { suggestions });
});

module.exports = router;
