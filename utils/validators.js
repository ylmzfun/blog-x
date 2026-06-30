const { body, param, query, validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

/**
 * Middleware: check validation results and return errors if any.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map(e => e.msg).join('; ');
    return badRequest(res, msg);
  }
  next();
}

/**
 * Shared validation rules.
 */
const registerRules = [
  body('username').trim().isLength({ min: 2, max: 30 }).withMessage('Username must be 2-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters'),
];

const loginRules = [
  body('email').notEmpty().withMessage('Email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const postRules = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200)'),
  body('content').optional().isString(),
  body('summary').optional().isString(),
  body('cover').optional().isString(),
  body('categoryId').optional().isString(),
  body('tagIds').optional().isArray(),
  body('status').optional().isIn(['published', 'draft']).withMessage('Status must be published or draft'),
];

const categoryRules = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Category name is required (max 50)'),
  body('slug').optional().trim().matches(/^[a-z0-9\-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
  body('description').optional().isString(),
];

const tagRules = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Tag name is required (max 50)'),
  body('slug').optional().trim().matches(/^[a-z0-9\-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
];

const commentRules = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment content is required (max 2000)'),
  body('parentId').optional({ nullable: true }),
];

const passwordRules = [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6, max: 100 }).withMessage('New password must be 6-100 characters'),
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).toInt(),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  postRules,
  categoryRules,
  tagRules,
  commentRules,
  passwordRules,
  paginationRules,
};
