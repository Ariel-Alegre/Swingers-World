const crypto = require('crypto');

const ENV_ADMIN_ID = 'env-admin';

function getEnvAdmin() {
  const email = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_LOGIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;
  if (!email || !password || !jwtSecret) return null;

  return {
    id: ENV_ADMIN_ID,
    name: 'Administrador',
    lastName: '',
    email,
    role: 'admin',
    authSource: 'env',
    authVersion: crypto.createHmac('sha256', jwtSecret).update(password).digest('hex'),
  };
}

function equalSecret(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(String(actual)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

function matchesEnvAdminEmail(email, admin = getEnvAdmin()) {
  return Boolean(admin && typeof email === 'string' && email.trim().toLowerCase() === admin.email);
}

function verifyEnvAdminPassword(password, admin = getEnvAdmin()) {
  return Boolean(admin && typeof password === 'string' && equalSecret(password, process.env.ADMIN_LOGIN_PASSWORD));
}

function verifyEnvAdminToken(decoded, admin = getEnvAdmin()) {
  return Boolean(
    admin &&
    decoded?.id === ENV_ADMIN_ID &&
    decoded?.role === 'admin' &&
    decoded?.authSource === 'env' &&
    typeof decoded.authVersion === 'string' &&
    equalSecret(decoded.authVersion, admin.authVersion)
  );
}

module.exports = {
  ENV_ADMIN_ID,
  getEnvAdmin,
  matchesEnvAdminEmail,
  verifyEnvAdminPassword,
  verifyEnvAdminToken,
};
