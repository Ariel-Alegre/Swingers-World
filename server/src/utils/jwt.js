const crypto = require('crypto');

class JsonWebTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

class TokenExpiredError extends Error {
  constructor(message, expiredAt) {
    super(message);
    this.name = 'TokenExpiredError';
    this.expiredAt = expiredAt;
  }
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new JsonWebTokenError('Malformed token.');
  }
}

function durationSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value || '').trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) throw new JsonWebTokenError('Invalid expiresIn value.');
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

function signature(input, secret) {
  if (!secret) throw new JsonWebTokenError('A secret is required to sign the token.');
  return crypto.createHmac('sha256', secret).update(input).digest('base64url');
}

function sign(payload, secret, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new JsonWebTokenError('The payload must be an object.');
  }
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: payload.iat || now };
  if (options.expiresIn !== undefined) body.exp = now + durationSeconds(options.expiresIn);
  if (options.audience) body.aud = options.audience;
  const header = { alg: 'HS256', typ: 'JWT' };
  const input = `${encode(header)}.${encode(body)}`;
  return `${input}.${signature(input, secret)}`;
}

function verify(token, secret, options = {}) {
  if (typeof token !== 'string') throw new JsonWebTokenError('Token is required.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new JsonWebTokenError('Malformed token.');
  const [encodedHeader, encodedPayload, providedSignature] = parts;
  const header = decode(encodedHeader);
  if (header.alg !== 'HS256') throw new JsonWebTokenError('Algorithm is not allowed.');

  const expectedSignature = signature(`${encodedHeader}.${encodedPayload}`, secret);
  const provided = Buffer.from(providedSignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new JsonWebTokenError('Invalid signature.');
  }

  const payload = decode(encodedPayload);
  const now = Math.floor(Date.now() / 1000);
  if (!options.ignoreExpiration && payload.exp !== undefined && now >= payload.exp) {
    throw new TokenExpiredError('Expired token.', new Date(payload.exp * 1000));
  }
  if (payload.nbf !== undefined && now < payload.nbf) throw new JsonWebTokenError('Token is not valid yet.');
  if (options.audience) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(options.audience)) throw new JsonWebTokenError('Invalid audience.');
  }
  return payload;
}

module.exports = { sign, verify, JsonWebTokenError, TokenExpiredError };
