export function newsletterSuitable(pathname) {
  return pathname === '/' || /^\/(products|product|blog|gallery|about|brand|contact|faq|privacy|return|shippingpolicy|termsandcondition)(\/|$)/.test(pathname || '');
}

export function normalizeNewsletterEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null;
  return email;
}
