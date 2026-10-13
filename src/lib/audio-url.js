/** Public audio URLs. Vite's BASE_URL always starts and ends with a slash. */
export function audioUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${String(path).replace(/^\//, '')}`;
}

export function wordAudioUrl(id, language = 'id') {
  const file = language === 'en' ? `${id}-en.mp3` : `${id}.mp3`;
  return audioUrl(`audio/words/${file}`);
}

export function walkingAudioUrl(term) {
  return audioUrl(`audio/walking/term-${term}-walking.mp3`);
}

export function walkingFileName(term) {
  return `term-${term}-walking.mp3`;
}
