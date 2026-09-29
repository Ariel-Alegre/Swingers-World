const { randomUUID } = require('crypto');

const DEFAULT_CODES = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

function requestContext(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

function normalizeErrorResponses(req, res, next) {
  const sendJson = res.json.bind(res);

  res.json = (payload) => {
    if (res.statusCode < 400) return sendJson(payload);

    const source = payload && typeof payload === 'object' ? payload : {};
    const status = res.statusCode || 500;
    const code = typeof source.code === 'string'
      ? source.code
      : DEFAULT_CODES[status] || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
    const safeMessage = status >= 500
      ? 'An unexpected server error occurred.'
      : typeof source.message === 'string' && source.message.trim()
        ? source.message
        : 'The request could not be completed.';

    return sendJson({
      code,
      message: safeMessage,
      requestId: req.requestId,
    });
  };

  next();
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    code: 'ROUTE_NOT_FOUND',
    message: 'The requested endpoint does not exist.',
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = Number(err.status || err.statusCode) || 500;
  const normalizedStatus = status >= 400 && status <= 599 ? status : 500;
  const code = err.code === 'LIMIT_FILE_SIZE'
    ? 'FILE_TOO_LARGE'
    : err.type === 'entity.too.large'
      ? 'PAYLOAD_TOO_LARGE'
      : err.type === 'entity.parse.failed'
        ? 'INVALID_JSON'
        : DEFAULT_CODES[normalizedStatus] || 'INTERNAL_ERROR';
  const publicMessages = {
    INVALID_JSON: 'The request body contains invalid JSON.',
    PAYLOAD_TOO_LARGE: 'The request payload is too large.',
    FILE_TOO_LARGE: 'The uploaded file is too large.',
  };
  const publicMessage = publicMessages[code]
    || (normalizedStatus >= 500 ? 'An unexpected server error occurred.' : 'The request could not be completed.');

  console.error(JSON.stringify({
    level: 'error',
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: normalizedStatus,
    code,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  }));

  return res.status(normalizedStatus).json({
    code,
    message: publicMessage,
  });
}

module.exports = {
  requestContext,
  normalizeErrorResponses,
  notFoundHandler,
  errorHandler,
};
