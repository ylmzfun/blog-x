const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { success, badRequest, unauthorized } = require('../../utils/response');
const { generateAccessToken, generateRefreshToken, invalidateRefreshToken, JWT_REFRESH_SECRET, authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { validate, registerRules, loginRules } = require('../../utils/validators');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authLimiter, registerRules, validate, (req, res) => {
  const { username, email, password } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return badRequest(res, 'Email or username already exists');
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, email, passwordHash, 'user');

  success(res, { id, username, email }, 'Registration successful', 201);
});

// POST /api/auth/login
router.post('/login', authLimiter, loginRules, validate, (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return unauthorized(res, 'Invalid email or password');
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return unauthorized(res, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token in DB
  db.prepare('UPDATE users SET refresh_token = ? WHERE id = ?').run(refreshToken, user.id);

  success(res, {
    accessToken,
    refreshToken,
    expiresIn: 7200,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  invalidateRefreshToken(req.user.id);
  success(res, null, 'Logged out');
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return badRequest(res, 'Refresh token is required');
  }

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (err) {
    return unauthorized(res, 'Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') {
    return unauthorized(res, 'Invalid token type');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND refresh_token = ?').get(decoded.id, refreshToken);
  if (!user) {
    return unauthorized(res, 'Refresh token has been revoked');
  }

  const newAccessToken = generateAccessToken(user);
  success(res, { accessToken: newAccessToken, expiresIn: 7200 });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) {
    return badRequest(res, 'Email is required');
  }
  // In a real app, send an email with a reset link.
  // For now, we just acknowledge the request.
  success(res, null, 'If the email exists, a reset link has been sent');
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return badRequest(res, 'Token and new password are required');
  }
  // In a real app, verify the token from the email link and update the password.
  // Stub: acknowledge the request.
  badRequest(res, 'Password reset via email is not yet implemented. Please contact the admin.');
});

module.exports = router;
