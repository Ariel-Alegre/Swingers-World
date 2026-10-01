const multer = require('multer');

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'audio/aac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]);

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(Object.assign(new Error('Unsupported chat media format.'), { status: 415 }));
    }
    return callback(null, true);
  },
});
