const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { slugify } = require('../../utils/slug');
const { success, badRequest, notFound } = require('../../utils/response');
const { authenticate, requireAdmin, requireAuthor } = require('../../middleware/auth');
const { validate, tagRules } = require('../../utils/validators');

const router = express.Router();

// GET /api/tags - Tag list with post counts
router.get('/', (req, res) => {
  const tags = db.prepare(`
    SELECT id, name, slug, post_count, created_at
    FROM tags ORDER BY post_count DESC, name ASC
  `).all();

  const list = tags.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    postCount: t.post_count,
    createdAt: t.created_at,
  }));

  success(res, list);
});

// POST /api/tags - Create tag (author+)
router.post('/', authenticate, requireAuthor, tagRules, validate, (req, res) => {
  const { name } = req.body;
  const slug = req.body.slug || slugify(name);

  const existing = db.prepare('SELECT id FROM tags WHERE slug = ?').get(slug);
  if (existing) return badRequest(res, 'Tag slug already exists');

  const id = uuidv4();
  db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);

  success(res, { id, name, slug, postCount: 0 }, 'Tag created', 201);
});

// DELETE /api/tags/:id - Delete tag (admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) return notFound(res, 'Tag not found');

  db.prepare('DELETE FROM post_tags WHERE tag_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);

  success(res, null, 'Tag deleted');
});

module.exports = router;
