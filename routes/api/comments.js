const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { success, paginated, badRequest, notFound, forbidden } = require('../../utils/response');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { commentLimiter } = require('../../middleware/rateLimiter');
const { validate, commentRules } = require('../../utils/validators');

const router = express.Router();

/**
 * Build a tree from flat comments list.
 */
function buildCommentTree(comments) {
  const map = {};
  const roots = [];

  for (const c of comments) {
    map[c.id] = { ...c, replies: [] };
  }

  for (const c of comments) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].replies.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  }

  // Remove parent_id helpers and format
  function format(node) {
    const item = {
      id: node.id,
      content: node.content,
      author: {
        id: node.author_id,
        username: node.author_username,
        avatar: node.author_avatar,
      },
      parentId: node.parent_id || null,
      replyTo: node.reply_to_id ? { id: node.reply_to_id, username: node.reply_to_username } : null,
      status: node.status,
      replies: (node.replies || []).map(format),
      createdAt: node.created_at,
    };
    return item;
  }

  return roots.map(format);
}

// GET /api/posts/:postId/comments
router.get('/posts/:postId/comments', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
  const { postId } = req.params;

  // Check post exists
  const post = db.prepare('SELECT id, status FROM posts WHERE id = ? AND deleted_at IS NULL').get(postId);
  if (!post) return notFound(res, 'Post not found');

  // Get top-level comments (parent_id IS NULL) with pagination
  const total = db.prepare(`
    SELECT COUNT(*) as total FROM comments
    WHERE post_id = ? AND parent_id IS NULL AND deleted_at IS NULL
  `).get(postId).total;

  const topComments = db.prepare(`
    SELECT c.id, c.content, c.author_id, c.parent_id, c.status, c.created_at,
           u.username as author_username, u.avatar as author_avatar,
           NULL as reply_to_id, NULL as reply_to_username
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.post_id = ? AND c.parent_id IS NULL AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(postId, pageSize, (page - 1) * pageSize);

  // Get all replies for these top-level comments (including nested)
  if (topComments.length > 0) {
    const commentIds = topComments.map(c => c.id);
    // Also get replies of replies (nested)
    const allReplies = getAllReplies(commentIds, postId);
    const list = buildCommentTree([...topComments, ...allReplies]);
    return paginated(res, list, total, page, pageSize);
  }

  paginated(res, [], total, page, pageSize);
});

/**
 * Recursively get all child replies.
 */
function getAllReplies(parentIds, postId) {
  if (parentIds.length === 0) return [];
  const placeholders = parentIds.map(() => '?').join(',');

  const replies = db.prepare(`
    SELECT c.id, c.content, c.author_id, c.parent_id, c.status, c.created_at,
           u.username as author_username, u.avatar as author_avatar,
           pc.author_id as reply_to_id, pu.username as reply_to_username
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    LEFT JOIN comments pc ON c.parent_id = pc.id
    LEFT JOIN users pu ON pc.author_id = pu.id
    WHERE c.post_id = ? AND c.parent_id IN (${placeholders}) AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `).all(postId, ...parentIds);

  if (replies.length === 0) return [];

  const childIds = replies.map(r => r.id);
  const nested = getAllReplies(childIds, postId);
  return [...replies, ...nested];
}

// POST /api/posts/:postId/comments
router.post('/posts/:postId/comments', authenticate, commentLimiter, commentRules, validate, (req, res) => {
  const { postId } = req.params;
  const { content, parentId } = req.body;

  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL AND status = ?').get(postId, 'published');
  if (!post) return notFound(res, 'Post not found');

  // If replying, check parent comment exists
  let replyToUserId = null;
  if (parentId) {
    const parent = db.prepare('SELECT author_id FROM comments WHERE id = ? AND post_id = ? AND deleted_at IS NULL').get(parentId, postId);
    if (!parent) return badRequest(res, 'Parent comment not found');
    replyToUserId = parent.author_id;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO comments (id, post_id, author_id, content, parent_id, status)
    VALUES (?, ?, ?, ?, ?, 'approved')
  `).run(id, postId, req.user.id, content, parentId || null);

  // Update comment count
  db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(postId);

  const comment = db.prepare(`
    SELECT c.id, c.content, c.author_id, c.parent_id, c.status, c.created_at,
           u.username as author_username, u.avatar as author_avatar
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.id = ?
  `).get(id);

  success(res, {
    id: comment.id,
    content: comment.content,
    author: { id: comment.author_id, username: comment.author_username, avatar: comment.author_avatar },
    parentId: comment.parent_id || null,
    replyTo: replyToUserId ? {
      id: replyToUserId,
      username: db.prepare('SELECT username FROM users WHERE id = ?').get(replyToUserId)?.username || '',
    } : null,
    status: comment.status,
    replies: [],
    createdAt: comment.created_at,
  }, 'Comment posted', 201);
});

// DELETE /api/comments/:id
router.delete('/comments/:id', authenticate, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!comment) return notFound(res, 'Comment not found');

  // Only comment author or admin can delete
  if (comment.author_id !== req.user.id && req.user.role !== 'admin') {
    return forbidden(res, 'You can only delete your own comments');
  }

  db.prepare('UPDATE comments SET deleted_at = datetime(\'now\') WHERE id = ?').run(req.params.id);

  // Decrement comment count
  db.prepare('UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?').run(comment.post_id);

  success(res, null, 'Comment deleted');
});

// PUT /api/comments/:id/approve - Approve comment (admin)
router.put('/comments/:id/approve', authenticate, requireAdmin, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!comment) return notFound(res, 'Comment not found');

  db.prepare("UPDATE comments SET status = 'approved', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  success(res, null, 'Comment approved');
});

module.exports = router;
