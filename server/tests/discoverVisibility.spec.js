const { expect } = require('chai');
const { isDiscoverable } = require('../src/utils/discoverVisibility');

describe('Discover visibility', () => {
  const registeredUser = {
    status: 'active',
    acceptedTerms: true,
    Profile: { publicProfile: true, photos: null, description: null, gender: null },
  };

  it('shows registered users even when their visible profile is incomplete', () => {
    expect(isDiscoverable(registeredUser)).to.equal(true);
  });

  it('respects hidden profiles and accounts without consent', () => {
    expect(isDiscoverable({ ...registeredUser, Profile: { publicProfile: false } })).to.equal(false);
    expect(isDiscoverable({ ...registeredUser, acceptedTerms: false })).to.equal(false);
    expect(isDiscoverable({ ...registeredUser, status: 'pending' })).to.equal(false);
  });
});
