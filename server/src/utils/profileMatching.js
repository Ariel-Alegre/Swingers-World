function normalizeCandidateGender(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['male', 'masculino', 'hombre', 'man'].includes(normalized)) return 'Male';
  if (['female', 'femenino', 'mujer', 'woman'].includes(normalized)) return 'Female';
  return null;
}

function matchesProfileSearch(profile, lookingForProfileType, lookingFor, lookingForCoupleType) {
  if (lookingForProfileType === 'couple') {
    return profile?.profileType === 'couple' && profile.coupleType === lookingForCoupleType;
  }

  if (profile?.profileType !== 'single') return false;
  const desiredGenders = {
    Women: ['Female'],
    Men: ['Male'],
    Both: ['Male', 'Female'],
  }[lookingFor] || [];

  return desiredGenders.includes(normalizeCandidateGender(profile.gender));
}

module.exports = { matchesProfileSearch };
