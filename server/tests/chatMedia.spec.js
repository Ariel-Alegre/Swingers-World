const { expect } = require('chai');
const { normalizeChatMediaType } = require('../src/middleware/uploadMessageMedia');

describe('chat media validation', () => {
  it('normalizes Expo Android m4a recordings sent as generic binary', () => {
    const file = { originalname: 'recording.m4a', mimetype: 'application/octet-stream' };

    expect(normalizeChatMediaType(file)).to.equal(true);
    expect(file.mimetype).to.equal('audio/mp4');
  });

  it('accepts the Android x-m4a MIME type', () => {
    const file = { originalname: 'recording.m4a', mimetype: 'audio/x-m4a' };

    expect(normalizeChatMediaType(file)).to.equal(true);
  });

  it('accepts an audio MIME type with codec parameters', () => {
    const file = { originalname: 'recording.m4a', mimetype: 'audio/mp4; codecs=mp4a.40.2' };

    expect(normalizeChatMediaType(file)).to.equal(true);
    expect(file.mimetype).to.equal('audio/mp4');
  });

  it('does not reinterpret arbitrary binary files as audio', () => {
    const file = { originalname: 'document.pdf', mimetype: 'application/octet-stream' };

    expect(normalizeChatMediaType(file)).to.equal(false);
    expect(file.mimetype).to.equal('application/octet-stream');
  });
});
