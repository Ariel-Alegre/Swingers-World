const { expect } = require('chai');
const {
  getDisplayName,
  localizedContent,
  normalizeLocale,
} = require('../src/utils/notificationService');

describe('Localized notifications', () => {
  it('uses the profile display name for individual and couple accounts', () => {
    expect(getDisplayName({
      firstName: 'Ana',
      lastName: 'Perez',
      Profile: { displayName: 'Ana y Marcos' },
    })).to.equal('Ana y Marcos');
  });

  it('creates Spanish copy for a private photo acceptance', () => {
    expect(localizedContent('es', 'photo_request_accepted', { actorName: 'Ana y Marcos' }))
      .to.deep.equal({
        title: 'Solicitud aceptada',
        body: 'Tu solicitud para ver las fotos privadas de Ana y Marcos fue aceptada.',
      });
  });

  it('creates English copy for incoming messages', () => {
    expect(localizedContent('en', 'message', { actorName: 'Mariano', preview: 'Hello' }))
      .to.deep.equal({ title: 'Mariano', body: 'Mariano: Hello' });
  });

  it('describes an audio message without exposing an empty preview', () => {
    expect(localizedContent('es', 'message', { actorName: 'Mariano', audio: true }))
      .to.deep.equal({ title: 'Mariano', body: 'Mariano te envió un audio.' });
  });

  it('falls back to Spanish for unsupported locales', () => {
    expect(normalizeLocale('pt')).to.equal('es');
  });
});
