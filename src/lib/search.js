export function normalise(value) {
  return String(value ?? '').toLocaleLowerCase('en-GB');
}

export function matchesQuery(item, query) {
  const needle = normalise(query).trim();
  if (!needle) return true;
  const haystack = [
    item.indonesian,
    item.english,
    item.root,
    item.standard,
    item.colloquialVariant,
    item.theme,
  ]
    .filter(Boolean)
    .join('\n');
  return normalise(haystack).includes(needle);
}

export function filterVocab(items, { query = '', term = 'all', theme = 'all', register = 'all' } = {}) {
  return items.filter((item) => {
    if (term !== 'all' && String(item.term) !== String(term)) return false;
    if (theme !== 'all' && item.theme !== theme) return false;
    if (register === 'colloquial' && !item.colloquial) return false;
    if (register === 'slang' && !item.slang) return false;
    if (register === 'standard' && (item.colloquial || item.slang)) return false;
    return matchesQuery(item, query);
  });
}
