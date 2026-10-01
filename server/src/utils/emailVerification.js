const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const jwt = require('./jwt');
const { EmailVerification, User } = require('../db');

const CODE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL = '15m';
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

class EmailVerificationError extends Error {
  constructor(code, status, message, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLocale(value) {
  return value === 'en' ? 'en' : 'es';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function codeHash(code) {
  const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('EMAIL_VERIFICATION_SECRET or JWT_SECRET must be configured.');
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
}

function safeHashEquals(left, right) {
  const leftBuffer = Buffer.from(String(left), 'hex');
  const rightBuffer = Buffer.from(String(right), 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function mailCopy(locale, code) {
  if (locale === 'en') {
    return {
      subject: `${code} is your Swingers World verification code`,
      preheader: 'Complete your email verification to create your account.',
      title: 'Verify your email',
      intro: 'Use this code to finish creating your Swingers World account:',
      expiry: 'This code expires in 10 minutes and can only be used once.',
      warning: 'If you did not request this code, you can safely ignore this email.',
    };
  }
  return {
    subject: `${code} es tu código de verificación de Swingers World`,
    preheader: 'Completá la verificación de tu correo para crear tu cuenta.',
    title: 'Verificá tu correo',
    intro: 'Usá este código para terminar de crear tu cuenta de Swingers World:',
    expiry: 'Este código vence en 10 minutos y solo puede utilizarse una vez.',
    warning: 'Si no solicitaste este código, podés ignorar este correo de forma segura.',
  };
}

function createTransporter() {
  if (!process.env.EMAIL || !process.env.PASS) {
    throw new EmailVerificationError('EMAIL_DELIVERY_UNAVAILABLE', 503, 'Email delivery is not configured.');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.PASS },
  });
}

async function sendVerificationEmail(email, locale, code) {
  const copy = mailCopy(locale, code);
  const logoCandidates = [
    path.resolve(__dirname, '../../../app/assets/swingers-world.png'),
    path.resolve(process.cwd(), '../app/assets/swingers-world.png'),
  ];
  const localLogoPath = logoCandidates.find((candidate) => fs.existsSync(candidate));
  const configuredLogoUrl = String(process.env.EMAIL_LOGO_URL || '').trim();
  const logoSource = configuredLogoUrl || (localLogoPath ? 'cid:swingers-world-logo' : '');
  const logoMarkup = logoSource
    ? `<img src="${logoSource}" width="112" height="112" alt="Swingers World" style="display:block;width:112px;height:112px;border:0;border-radius:25px;object-fit:cover" />`
    : '<div style="width:76px;height:76px;line-height:76px;border-radius:22px;background:#170d18;color:#f1bd70;font-size:32px;font-weight:900;text-align:center;border:1px solid #58354f">SW</div>';

  await createTransporter().sendMail({
    from: `"Swingers World" <${process.env.EMAIL}>`,
    to: email,
    subject: copy.subject,
    text: `${copy.title}\n\n${copy.intro}\n\n${code}\n\n${copy.expiry}\n${copy.warning}`,
    attachments: localLogoPath && !configuredLogoUrl ? [{
      filename: 'swingers-world.png',
      path: localLogoPath,
      cid: 'swingers-world-logo',
      contentDisposition: 'inline',
    }] : [],
    html: `<!doctype html>
      <html lang="${locale}">
        <body style="margin:0;padding:0;background:#0b080d;font-family:Arial,Helvetica,sans-serif;color:#fff8ee">
          <div style="display:none;max-height:0;overflow:hidden">${copy.preheader}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#0b080d">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;margin:0 auto">
                <tr><td height="32" style="height:32px"></td></tr>
                <tr><td align="center" style="padding:0 20px 20px">${logoMarkup}</td></tr>
                <tr><td align="center" style="padding:0 20px 10px;color:#f4c57d;font-size:12px;font-weight:800;letter-spacing:3px">SWINGERS WORLD</td></tr>
                <tr><td style="padding:0 16px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#1b121f;border:1px solid #493049;border-radius:24px">
                    <tr><td align="center" style="padding:38px 30px 0;color:#fff8ee;font-size:28px;line-height:34px;font-weight:800">${copy.title}</td></tr>
                    <tr><td align="center" style="padding:14px 34px 0;color:#cbbdca;font-size:16px;line-height:24px">${copy.intro}</td></tr>
                    <tr><td align="center" style="padding:30px 20px">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr><td align="center" style="padding:18px 24px;background:#fff8ee;border-radius:16px;color:#211725;font-size:34px;line-height:40px;font-weight:900;letter-spacing:9px">${code}</td></tr>
                      </table>
                    </td></tr>
                    <tr><td align="center" style="padding:0 34px;color:#f4c57d;font-size:14px;line-height:22px;font-weight:700">${copy.expiry}</td></tr>
                    <tr><td style="padding:30px 34px 0"><div style="height:1px;background:#493049;line-height:1px;font-size:1px">&nbsp;</div></td></tr>
                    <tr><td align="center" style="padding:22px 34px 36px;color:#948694;font-size:12px;line-height:19px">${copy.warning}</td></tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:22px 24px 34px;color:#6f626f;font-size:11px;line-height:17px">© ${new Date().getFullYear()} Swingers World · ${locale === 'en' ? 'Private and secure connections' : 'Conexiones privadas y seguras'}</td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>`,
  });
}

async function requestEmailVerification(rawEmail, requestedLocale) {
  const email = normalizeEmail(rawEmail);
  const locale = normalizeLocale(requestedLocale);
  if (!isEmail(email)) throw new EmailVerificationError('VALIDATION_ERROR', 400, 'A valid email address is required.');

  if (await User.findOne({ where: { email } })) {
    throw new EmailVerificationError('EMAIL_ALREADY_REGISTERED', 409, 'A user with that email address already exists.');
  }

  const existing = await EmailVerification.findOne({ where: { email } });
  const now = Date.now();
  if (existing && now - new Date(existing.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - new Date(existing.lastSentAt).getTime())) / 1000);
    throw new EmailVerificationError('VERIFICATION_CODE_COOLDOWN', 429, 'Wait before requesting another verification code.', { retryAfterSeconds });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const values = {
    codeHash: codeHash(code), locale, expiresAt: new Date(now + CODE_TTL_MS), lastSentAt: new Date(now),
    attempts: 0, verifiedAt: null, consumedAt: null,
  };
  const record = existing ? await existing.update(values) : await EmailVerification.create({ email, ...values });

  try {
    await sendVerificationEmail(email, locale, code);
  } catch (error) {
    await record.destroy().catch(() => {});
    if (error instanceof EmailVerificationError) throw error;
    throw new EmailVerificationError('EMAIL_DELIVERY_FAILED', 502, 'The verification email could not be sent.');
  }
  return { expiresInSeconds: CODE_TTL_MS / 1000, resendAfterSeconds: RESEND_COOLDOWN_MS / 1000 };
}

async function verifyEmailCode(rawEmail, rawCode) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode || '').trim();
  if (!isEmail(email) || !/^\d{6}$/.test(code)) {
    throw new EmailVerificationError('VERIFICATION_CODE_INVALID', 400, 'The verification code is invalid.');
  }

  const record = await EmailVerification.findOne({ where: { email } });
  if (!record || record.consumedAt) throw new EmailVerificationError('VERIFICATION_CODE_INVALID', 400, 'The verification code is invalid.');
  if (new Date(record.expiresAt).getTime() <= Date.now()) throw new EmailVerificationError('VERIFICATION_CODE_EXPIRED', 410, 'The verification code has expired.');
  if (record.attempts >= MAX_ATTEMPTS) throw new EmailVerificationError('VERIFICATION_TOO_MANY_ATTEMPTS', 429, 'Too many verification attempts. Request a new code.');

  if (!safeHashEquals(record.codeHash, codeHash(code))) {
    const attempts = record.attempts + 1;
    await record.update({ attempts });
    if (attempts >= MAX_ATTEMPTS) throw new EmailVerificationError('VERIFICATION_TOO_MANY_ATTEMPTS', 429, 'Too many verification attempts. Request a new code.');
    throw new EmailVerificationError('VERIFICATION_CODE_INVALID', 400, 'The verification code is invalid.');
  }

  await record.update({ verifiedAt: new Date() });
  return {
    verificationToken: jwt.sign({ purpose: 'email-verification', email, verificationId: record.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL }),
  };
}

async function getVerifiedEmailRecord(rawToken, rawEmail, transaction) {
  const email = normalizeEmail(rawEmail);
  if (!rawToken) throw new EmailVerificationError('EMAIL_VERIFICATION_REQUIRED', 403, 'Email verification is required.');
  let payload;
  try {
    payload = jwt.verify(rawToken, process.env.JWT_SECRET);
  } catch {
    throw new EmailVerificationError('EMAIL_VERIFICATION_REQUIRED', 403, 'Email verification is invalid or expired.');
  }
  if (payload.purpose !== 'email-verification' || payload.email !== email || !payload.verificationId) {
    throw new EmailVerificationError('EMAIL_VERIFICATION_REQUIRED', 403, 'Email verification is invalid or expired.');
  }
  const record = await EmailVerification.findOne({
    where: { id: payload.verificationId, email }, transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!record?.verifiedAt || record.consumedAt || new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new EmailVerificationError('EMAIL_VERIFICATION_REQUIRED', 403, 'Email verification is invalid or expired.');
  }
  return record;
}

module.exports = {
  EmailVerificationError, getVerifiedEmailRecord, normalizeEmail, requestEmailVerification, verifyEmailCode,
};
