const VALID_PROFILE_TYPES = ['single', 'couple'];
const VALID_COUPLE_TYPES = ['woman_man', 'two_women', 'two_men', 'other'];
const VALID_LOOKING_FOR_PROFILE_TYPES = ['single', 'couple', 'both'];
const VALID_LOOKING_FOR = ['men', 'women', 'both'];
const VALID_LOOKING_FOR_COUPLE_TYPES = [...VALID_COUPLE_TYPES, 'all'];

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isProfileComplete(profile) {
  if (!profile || !VALID_PROFILE_TYPES.includes(profile.profileType)) return false;
  if (!hasText(profile.displayName) || !hasText(profile.description) || !hasText(profile.address)) return false;
  if (!Array.isArray(profile.photos) || !profile.photos.some((photo) => hasText(photo?.url))) return false;

  if (profile.profileType === 'single' && !hasText(profile.gender)) return false;
  if (profile.profileType === 'couple' && (
    !hasText(profile.partnerFirstName)
    || !hasText(profile.partnerLastName)
    || !VALID_COUPLE_TYPES.includes(profile.coupleType)
  )) return false;

  if (!VALID_LOOKING_FOR_PROFILE_TYPES.includes(profile.lookingForProfileType)) return false;
  if (profile.lookingForProfileType === 'single' && !VALID_LOOKING_FOR.includes(String(profile.lookingFor || '').trim().toLowerCase())) return false;
  if (profile.lookingForProfileType === 'couple' && !VALID_LOOKING_FOR_COUPLE_TYPES.includes(profile.lookingForCoupleType)) return false;

  return true;
}

module.exports = { isProfileComplete };
