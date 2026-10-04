function isDiscoverable(user) {
  return Boolean(
    user &&
    user.status === 'active' &&
    user.acceptedTerms === true &&
    user.Profile?.publicProfile === true
  );
}

module.exports = { isDiscoverable };
