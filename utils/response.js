/**
 * Unified JSON response helpers.
 */

const HTTP_CODE = {
  SUCCESS: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

function success(res, data = null, message = 'success', status = 200) {
  return res.status(status).json({ code: HTTP_CODE.SUCCESS, message, data });
}

function paginated(res, list, total, page, pageSize, message = 'success') {
  return res.status(200).json({
    code: HTTP_CODE.SUCCESS,
    message,
    data: { list, total, page, pageSize },
  });
}

function error(res, code, message, status = 400) {
  const statusMap = {
    400: 400,
    401: 401,
    403: 403,
    404: 404,
    500: 500,
  };
  return res.status(statusMap[code] || status).json({ code, message, data: null });
}

function badRequest(res, message = 'Bad request') {
  return error(res, 400, message, 400);
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, 401, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return error(res, 403, message, 403);
}

function notFound(res, message = 'Not found') {
  return error(res, 404, message, 404);
}

function serverError(res, message = 'Internal server error') {
  return error(res, 500, message, 500);
}

module.exports = {
  HTTP_CODE,
  success,
  paginated,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
};
