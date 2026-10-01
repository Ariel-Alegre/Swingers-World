const multer = require('multer');
const path = require('path');

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'audio/aac',
  'audio/amr',
  'audio/3gpp',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]);

const audioMimeByExtension = {
  '.3gp': 'audio/3gpp',
  '.aac': 'audio/aac',
  '.amr': 'audio/amr',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
};

function normalizeChatMediaType(file) {
  file.mimetype = String(file.mimetype || '').split(';', 1)[0].trim().toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  const detectedAudioType = audioMimeByExtension[extension];

  // Android/Expo Go may label a valid recording as generic binary or video/mp4.
  // Only reinterpret it when the filename has a known audio-only extension.
  if (detectedAudioType && ['application/octet-stream', 'video/mp4'].includes(file.mimetype)) {
    file.mimetype = detectedAudioType;
  }

  return allowedTypes.has(file.mimetype);
}

const uploadMessageMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!normalizeChatMediaType(file)) {
      return callback(Object.assign(new Error('Unsupported chat media format.'), { status: 415 }));
    }
    return callback(null, true);
  },
});

module.exports = uploadMessageMedia;
module.exports.normalizeChatMediaType = normalizeChatMediaType;
