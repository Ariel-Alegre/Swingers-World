const { expect } = require('chai');
const jwt = require('../src/utils/jwt');
const {
  materializeMediaReferences,
  normalizeStorageReference,
} = require('../src/utils/objectStorage');

describe('JWT HS256', () => {
  it('signs and verifies compatible tokens', () => {
    const token = jwt.sign({ id: 'user-1', role: 'user' }, 'test-secret', { expiresIn: '15m' });
    expect(jwt.verify(token, 'test-secret')).to.include({ id: 'user-1', role: 'user' });
  });

  it('rejects modified signatures', () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-secret', { expiresIn: '15m' });
    expect(() => jwt.verify(`${token.slice(0, -1)}x`, 'test-secret')).to.throw('Invalid signature.');
  });
});

describe('Railway Bucket media references', () => {
  before(() => {
    process.env.MEDIA_URL_SECRET = 'media-test-secret';
  });

  it('materializes internal references and can restore them', () => {
    const reference = 'railway://profile-photos/example.jpg';
    const result = materializeMediaReferences(
      { profile: { photos: [{ url: reference }] } },
      'https://api.example.com',
    );

    expect(result.profile.photos[0].url).to.match(/^https:\/\/api\.example\.com\/api\/media\//);
    expect(normalizeStorageReference(result.profile.photos[0].url)).to.equal(reference);
  });

  it('keeps legacy URLs unchanged', () => {
    const legacy = 'https://legacy.example.com/photo.jpg';
    expect(materializeMediaReferences({ url: legacy }, 'https://api.example.com').url).to.equal(legacy);
  });
});
