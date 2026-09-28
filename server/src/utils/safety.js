const OBJECTIONABLE_PATTERNS = [
  { code: 'underage', regex: /\b(minor|underage|child|children|kid|kids|teen\b|teenage|under 18|17 years old|16 years old|15 years old|14 years old|menor|menores|niñ[oa]s?|adolescente)\b/i },
  { code: 'non_consensual', regex: /\b(rape|raping|forced sex|forced|coercion|non-consensual|without consent|violaci[oó]n|violar|forzada|sin consentimiento)\b/i },
  { code: 'exploitation', regex: /\b(trafficking|grooming|sexual slavery|exploit(?:ation)?|prostituci[oó]n forzada)\b/i },
  { code: 'hate_or_violent_threat', regex: /\b(kill you|kill him|kill her|hate crime|lynch|nazis?|terrorist propaganda)\b/i },
];

function findObjectionableMatch(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const value = text.trim();
  if (!value) {
    return null;
  }

  for (const pattern of OBJECTIONABLE_PATTERNS) {
    if (pattern.regex.test(value)) {
      return pattern.code;
    }
  }

  return null;
}

module.exports = {
  findObjectionableMatch,
};
