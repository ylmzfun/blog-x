const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'blog-express-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'blog-express-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRES = '2h';
const REFRESH_TOKEN_EXPIRES = '7d';

/**
 * Generate an access token.
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

/**
 * Generate a refresh token.
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
}

/**
 * Verify access token and attach user to request.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
}

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // ignore invalid token
  }
  next();
}

/**
 * Require a minimum role.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions');
    }
    next();
  };
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Require author or admin role.
 */
function requireAuthor(req, res, next) {
  return requireRole('admin', 'author')(req, res, next);
}

/**
 * Logout: remove refresh token from DB.
 */
function invalidateRefreshToken(userId) {
  db.prepare('UPDATE users SET refresh_token = NULL WHERE id = ?').run(userId);
}

module.exports = {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRES,
  generateAccessToken,
  generateRefreshToken,
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireAuthor,
  invalidateRefreshToken,
};
