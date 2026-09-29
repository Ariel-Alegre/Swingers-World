const { expect } = require('chai');
const { matchesProfileSearch } = require('../src/utils/profileMatching');

describe('Discover profile matching', () => {
  it('shows a single woman to a couple looking for a single woman', () => {
    expect(matchesProfileSearch(
      { profileType: 'single', gender: 'Female' },
      'single',
      'Women',
      null,
    )).to.equal(true);
  });

  it('does not show a couple when the user selected a single person', () => {
    expect(matchesProfileSearch(
      { profileType: 'couple', coupleType: 'two_women' },
      'single',
      'Women',
      null,
    )).to.equal(false);
  });

  it('matches the selected couple composition exactly', () => {
    expect(matchesProfileSearch(
      { profileType: 'couple', coupleType: 'two_women' },
      'couple',
      null,
      'two_women',
    )).to.equal(true);
    expect(matchesProfileSearch(
      { profileType: 'couple', coupleType: 'woman_man' },
      'couple',
      null,
      'two_women',
    )).to.equal(false);
  });
});
