const { randomUUID } = require('crypto');
const jwt = require('./jwt');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const STORAGE_PREFIX = 'railway://';
let client;

function getConfig() {
  const config = {
    bucket: process.env.BUCKET || process.env.AWS_S3_BUCKET_NAME || process.env.BUCKET_NAME,
    endpoint: process.env.ENDPOINT || process.env.AWS_ENDPOINT_URL || process.env.BUCKET_ENDPOINT,
    region: process.env.REGION || process.env.AWS_DEFAULT_REGION || 'auto',
    accessKeyId: process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    const error = new Error(`Missing Railway Bucket configuration: ${missing.join(', ')}`);
    error.status = 503;
    error.code = 'STORAGE_NOT_CONFIGURED';
    error.publicMessage = 'Media storage is temporarily unavailable.';
    throw error;
  }

  return config;
}

function getClient() {
  if (!client) {
    const config = getConfig();
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: (process.env.AWS_S3_URL_STYLE || '').toLowerCase() === 'path',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

function extensionFor(file = {}) {
  const byMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'audio/aac': '.aac',
    'audio/amr': '.amr',
    'audio/3gpp': '.3gp',
    'audio/x-m4a': '.m4a',
    'audio/m4a': '.m4a',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/webm': '.webm',
  };
  if (byMime[file.mimetype]) return byMime[file.mimetype];
  const match = String(file.originalname || '').match(/\.[a-zA-Z0-9]{1,6}$/);
  return match ? match[0].toLowerCase() : '';
}

function storageReference(key) {
  return `${STORAGE_PREFIX}${key}`;
}

function keyFromReference(value) {
  return typeof value === 'string' && value.startsWith(STORAGE_PREFIX)
    ? value.slice(STORAGE_PREFIX.length)
    : null;
}

function mediaSecret() {
  const secret = process.env.MEDIA_URL_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('MEDIA_URL_SECRET or JWT_SECRET is required to sign files.');
  return secret;
}

function getRequestBaseUrl(req) {
  const configured = process.env.PUBLIC_API_URL?.replace(/\/$/, '');
  return configured || `${req.protocol}://${req.get('host')}`;
}

function getConfiguredBaseUrl() {
  return process.env.PUBLIC_API_URL?.replace(/\/$/, '') || `http://localhost:${process.env.PORT || 3001}`;
}

function signReference(reference, baseUrl) {
  const key = keyFromReference(reference);
  if (!key) return reference;
  const token = jwt.sign({ key }, mediaSecret(), { expiresIn: '15m', audience: 'media' });
  return `${baseUrl}/api/media/${token}`;
}

function materializeMediaReferences(value, baseUrl, seen = new WeakSet()) {
  if (typeof value === 'string') return signReference(value, baseUrl);
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);

  if (typeof value.toJSON === 'function') {
    return materializeMediaReferences(value.toJSON(), baseUrl, seen);
  }
  if (Array.isArray(value)) {
    return value.map((item) => materializeMediaReferences(item, baseUrl, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, materializeMediaReferences(item, baseUrl, seen)]),
  );
}

function normalizeStorageReference(value) {
  if (keyFromReference(value)) return value;
  if (typeof value !== 'string') return value;
  const match = value.match(/\/api\/media\/([^/?#]+)/);
  if (!match) return value;
  try {
    const decoded = jwt.verify(match[1], mediaSecret(), { audience: 'media', ignoreExpiration: true });
    return decoded?.key ? storageReference(decoded.key) : value;
  } catch {
    return value;
  }
}

async function uploadFile(file, folder) {
  if (!file?.buffer?.length) throw new Error('The file is empty.');
  const mediaType = String(file.mimetype || '');
  if (!mediaType.startsWith('image/') && !mediaType.startsWith('audio/')) {
    throw new Error('Only images and audio files are allowed.');
  }
  const config = getConfig();
  const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
  const key = `${safeFolder}/${randomUUID()}${extensionFor(file)}`;

  await getClient().send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype || 'application/octet-stream',
    CacheControl: 'private, max-age=3600',
  }));

  return storageReference(key);
}

async function deleteStoredObject(reference) {
  const key = keyFromReference(reference);
  if (!key) return false;
  const config = getConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  return true;
}

async function streamMediaToken(token, req, res) {
  const decoded = jwt.verify(token, mediaSecret(), { audience: 'media' });
  if (!decoded?.key) throw Object.assign(new Error('Invalid file link.'), { status: 401 });
  const config = getConfig();
  const requestedRange = req.headers.range;
  const object = await getClient().send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: decoded.key,
    ...(requestedRange ? { Range: requestedRange } : {}),
  }));

  res.setHeader('Content-Type', object.ContentType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Disposition', 'inline');
  if (requestedRange && object.ContentRange) {
    res.status(206);
    res.setHeader('Content-Range', object.ContentRange);
  }
  if (object.ContentLength !== undefined) res.setHeader('Content-Length', String(object.ContentLength));
  object.Body.pipe(res);
}

module.exports = {
  uploadFile,
  deleteStoredObject,
  streamMediaToken,
  materializeMediaReferences,
  normalizeStorageReference,
  getRequestBaseUrl,
  getConfiguredBaseUrl,
};
