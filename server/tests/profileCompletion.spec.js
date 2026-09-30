const { expect } = require('chai');
const { isProfileComplete } = require('../src/utils/profileCompletion');

const completeSingleProfile = {
  profileType: 'single',
  displayName: 'Mariano',
  description: 'A complete profile',
  address: 'Buenos Aires',
  photos: [{ url: 'railway://profile-photos/photo.jpg' }],
  gender: 'Male',
  lookingForProfileType: 'both',
};

describe('Profile completion', () => {
  it('accepts a complete individual profile looking for both profile types', () => {
    expect(isProfileComplete(completeSingleProfile)).to.equal(true);
  });

  it('rejects a profile without a photo, description, or location', () => {
    expect(isProfileComplete({ ...completeSingleProfile, photos: [] })).to.equal(false);
    expect(isProfileComplete({ ...completeSingleProfile, description: '' })).to.equal(false);
    expect(isProfileComplete({ ...completeSingleProfile, address: null })).to.equal(false);
  });

  it('requires both partner names and a valid composition for couples', () => {
    expect(isProfileComplete({
      ...completeSingleProfile,
      profileType: 'couple',
      gender: null,
      partnerFirstName: 'Ana',
      partnerLastName: 'Pérez',
      coupleType: 'woman_man',
    })).to.equal(true);
    expect(isProfileComplete({
      ...completeSingleProfile,
      profileType: 'couple',
      gender: null,
      partnerFirstName: 'Ana',
      partnerLastName: '',
      coupleType: 'woman_man',
    })).to.equal(false);
  });
});
