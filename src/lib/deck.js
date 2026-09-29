export function filterDeck(items, { term = 'all', theme = 'all', pool = 'all', progress = {} } = {}) {
  return items.filter((item) => {
    if (term !== 'all' && String(item.term) !== String(term)) return false;
    if (theme !== 'all' && item.theme !== theme) return false;
    const mark = progress[item.id];
    if (pool === 'known') return mark === 'known';
    if (pool === 'unknown') return mark === 'unknown';
    if (pool === 'remaining') return mark !== 'known';
    return true;
  });
}

export function shuffleItems(items, random = Math.random) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** English prompt with the root note and the standard-form arrow removed, so the answer is not printed on the front of the card. */
export function promptEnglish(english) {
  return String(english)
    .replace(/\s*\(←[^)]*\)/g, '')
    .replace(/\s*→\s*.+$/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .trim();
}

export function summarise(items, progress) {
  let known = 0;
  let unknown = 0;
  let unseen = 0;
  for (const item of items) {
    const mark = progress[item.id];
    if (mark === 'known') known += 1;
    else if (mark === 'unknown') unknown += 1;
    else unseen += 1;
  }
  return { known, unknown, unseen, total: items.length };
}
