const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { success, badRequest } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// POST /api/upload/image - Upload article cover/image
router.post('/image', authenticate, function (req, res, next) {
  uploadImage.single('file')(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return badRequest(res, 'File too large (max 5MB)');
        return badRequest(res, err.message);
      }
      return badRequest(res, err.message);
    }
    if (!req.file) return badRequest(res, 'No file uploaded');
    const url = `/uploads/${req.file.filename}`;
    success(res, { url, filename: req.file.filename });
  });
});

// POST /api/upload/avatar - Upload avatar
router.post('/avatar', authenticate, function (req, res, next) {
  uploadAvatar.single('file')(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return badRequest(res, 'File too large (max 2MB)');
        return badRequest(res, err.message);
      }
      return badRequest(res, err.message);
    }
    if (!req.file) return badRequest(res, 'No file uploaded');
    const url = `/uploads/avatars/${req.file.filename}`;
    success(res, { url, filename: req.file.filename });
  });
});

module.exports = router;
