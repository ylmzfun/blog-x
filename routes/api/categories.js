const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { slugify } = require('../../utils/slug');
const { success, badRequest, notFound } = require('../../utils/response');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { validate, categoryRules } = require('../../utils/validators');

const router = express.Router();

// GET /api/categories - Category list with post counts
router.get('/', (req, res) => {
  const categories = db.prepare(`
    SELECT id, name, slug, description, post_count, created_at
    FROM categories ORDER BY name ASC
  `).all();

  const list = categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    postCount: c.post_count,
    createdAt: c.created_at,
  }));

  success(res, list);
});

// GET /api/categories/:slug - Category detail
router.get('/:slug', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) return notFound(res, 'Category not found');

  success(res, {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    postCount: category.post_count,
    createdAt: category.created_at,
  });
});

// POST /api/categories - Create category (admin)
router.post('/', authenticate, requireAdmin, categoryRules, validate, (req, res) => {
  const { name, description } = req.body;
  const slug = req.body.slug || slugify(name);

  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (existing) return badRequest(res, 'Category slug already exists');

  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)')
    .run(id, name, slug, description || '');

  success(res, { id, name, slug, description: description || '' }, 'Category created', 201);
});

// PUT /api/categories/:id - Update category (admin)
router.put('/:id', authenticate, requireAdmin, categoryRules, validate, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return notFound(res, 'Category not found');

  const { name, description } = req.body;
  const slug = req.body.slug || (name ? slugify(name) : category.slug);

  if (slug !== category.slug) {
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(slug, req.params.id);
    if (existing) return badRequest(res, 'Category slug already exists');
  }

  db.prepare(`
    UPDATE categories SET name = ?, slug = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name || category.name, slug, description !== undefined ? description : category.description, req.params.id);

  success(res, { id: category.id, slug }, 'Category updated');
});

// DELETE /api/categories/:id - Delete category (admin)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return notFound(res, 'Category not found');

  // Unset category from posts
  db.prepare('UPDATE posts SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);

  success(res, null, 'Category deleted');
});

module.exports = router;
