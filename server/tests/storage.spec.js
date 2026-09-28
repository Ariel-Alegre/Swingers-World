const { expect } = require('chai');
const jwt = require('../src/utils/jwt');
const {
  materializeMediaReferences,
  normalizeStorageReference,
} = require('../src/utils/objectStorage');

describe('JWT HS256', () => {
  it('firma y verifica tokens compatibles', () => {
    const token = jwt.sign({ id: 'user-1', role: 'usuario' }, 'test-secret', { expiresIn: '15m' });
    expect(jwt.verify(token, 'test-secret')).to.include({ id: 'user-1', role: 'usuario' });
  });

  it('rechaza firmas modificadas', () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-secret', { expiresIn: '15m' });
    expect(() => jwt.verify(`${token.slice(0, -1)}x`, 'test-secret')).to.throw('Firma inválida');
  });
});

describe('Railway Bucket media references', () => {
  before(() => {
    process.env.MEDIA_URL_SECRET = 'media-test-secret';
  });

  it('materializa referencias internas y puede recuperarlas', () => {
    const reference = 'railway://profile-photos/example.jpg';
    const result = materializeMediaReferences(
      { profile: { photos: [{ url: reference }] } },
      'https://api.example.com',
    );

    expect(result.profile.photos[0].url).to.match(/^https:\/\/api\.example\.com\/api\/media\//);
    expect(normalizeStorageReference(result.profile.photos[0].url)).to.equal(reference);
  });

  it('deja intactas las URLs heredadas', () => {
    const legacy = 'https://legacy.example.com/photo.jpg';
    expect(materializeMediaReferences({ url: legacy }, 'https://api.example.com').url).to.equal(legacy);
  });
});
