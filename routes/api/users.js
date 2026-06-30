const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const { success, badRequest, notFound, unauthorized } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');
const { validate, passwordRules } = require('../../utils/validators');

const router = express.Router();

// GET /api/users/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, avatar, bio, website, role, email_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) return notFound(res, 'User not found');

  success(res, {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    website: user.website,
    role: user.role,
    createdAt: user.created_at,
  });
});

// PUT /api/users/me
router.put('/me', authenticate, (req, res) => {
  const { username, avatar, bio, website } = req.body;
  const userId = req.user.id;

  if (username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existing) return badRequest(res, 'Username already taken');
  }

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!current) return notFound(res, 'User not found');

  db.prepare(`
    UPDATE users SET
      username = ?, avatar = ?, bio = ?, website = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    username || current.username,
    avatar !== undefined ? avatar : current.avatar,
    bio !== undefined ? bio : current.bio,
    website !== undefined ? website : current.website,
    userId
  );

  const updated = db.prepare('SELECT id, username, email, avatar, bio, website, role FROM users WHERE id = ?').get(userId);
  success(res, updated, 'Profile updated');
});

// PUT /api/users/me/password
router.put('/me/password', authenticate, passwordRules, validate, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return badRequest(res, 'Old password is incorrect');
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, req.user.id);

  success(res, null, 'Password updated');
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = db.prepare(`
    SELECT id, username, avatar, bio, website, role, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return notFound(res, 'User not found');

  success(res, {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    website: user.website,
    role: user.role,
    createdAt: user.created_at,
  });
});

module.exports = router;
