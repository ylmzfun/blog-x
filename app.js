var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// API routes
var authRoutes = require('./routes/api/auth');
var userRoutes = require('./routes/api/users');
var categoryRoutes = require('./routes/api/categories');
var tagRoutes = require('./routes/api/tags');
var commentRoutes = require('./routes/api/comments');
var postRoutes = require('./routes/api/posts');
var searchRoutes = require('./routes/api/search');
var statsRoutes = require('./routes/api/stats');
var uploadRoutes = require('./routes/api/upload');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API routes — comment routes must be before post routes
// so that /api/posts/:postId/comments is matched before /api/posts/:slug
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', commentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler — return JSON for API routes, HTML for others
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  if (req.path.startsWith('/api/')) {
    var status = err.status || 500;
    var code = status >= 500 ? 500 : status;
    return res.status(status).json({
      code: code,
      message: err.message || 'Internal server error',
      data: null,
    });
  }

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
