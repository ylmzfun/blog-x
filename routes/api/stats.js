const express = require('express');
const db = require('../../db');
const { success } = require('../../utils/response');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// GET /api/stats/overview
router.get('/overview', authenticate, requireAdmin, (req, res) => {
  const totalPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE deleted_at IS NULL AND status = 'published'").get().count;
  const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE deleted_at IS NULL').get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  // Simple PV/UV tracking using today's view count changes
  const todayPV = db.prepare(`
    SELECT COALESCE(SUM(view_count), 0) as total FROM posts
    WHERE deleted_at IS NULL AND status = 'published'
  `).get().total;

  success(res, {
    totalPosts,
    totalComments,
    totalUsers,
    todayPV,
    todayUV: 0, // UV tracking would require a separate visits table
  });
});

// GET /api/stats/posts/top - Top posts by views
router.get('/posts/top', authenticate, requireAdmin, (req, res) => {
  const posts = db.prepare(`
    SELECT id, title, slug, view_count, published_at
    FROM posts
    WHERE deleted_at IS NULL AND status = 'published'
    ORDER BY view_count DESC
    LIMIT 10
  `).all();

  success(res, posts.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    viewCount: p.view_count,
    publishedAt: p.published_at,
  })));
});

module.exports = router;
