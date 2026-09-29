const FIXED_IDS = {
  '1. Overview': 'overview',
  '2. Term-by-term plan': 'terms',
  'Appendix A. Register: pronouns and colloquial Jakarta features': 'appendix-a',
  'Appendix B. Affix reference': 'appendix-b',
};

export function slugify(text) {
  if (FIXED_IDS[text]) return FIXED_IDS[text];
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
