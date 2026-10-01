const {
  EmailVerificationError,
  requestEmailVerification,
  verifyEmailCode,
} = require('../utils/emailVerification');

function sendError(res, error) {
  if (error instanceof EmailVerificationError) {
    if (error.details?.retryAfterSeconds) res.set('Retry-After', String(error.details.retryAfterSeconds));
    return res.status(error.status).json({ code: error.code, message: error.message, ...error.details });
  }
  console.error('Email verification failed:', error);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' });
}

async function RequestEmailVerification(req, res) {
  try {
    const result = await requestEmailVerification(req.body?.email, req.body?.locale);
    return res.status(202).json({ code: 'VERIFICATION_CODE_SENT', ...result });
  } catch (error) {
    return sendError(res, error);
  }
}

async function VerifyEmailCode(req, res) {
  try {
    const result = await verifyEmailCode(req.body?.email, req.body?.code);
    return res.status(200).json({ code: 'EMAIL_VERIFIED', ...result });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = { RequestEmailVerification, VerifyEmailCode };
