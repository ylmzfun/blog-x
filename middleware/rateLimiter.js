/*
 * @Author: ylmzfun ylmzfun@163.com
 * @Date: 2026-06-30 14:57:22
 * @LastEditors: ylmzfun ylmzfun@163.com
 * @LastEditTime: 2026-06-30 14:59:47
 * @FilePath: /blog-express/middleware/rateLimiter.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for auth endpoints (login, register, forgot-password).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 400, message: 'Too many requests, please try again later', data: null },
});

/**
 * Rate limiter for comment posting.
 */
const commentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 400, message: 'Too many comments, please slow down', data: null },
});

module.exports = { authLimiter, commentLimiter };
