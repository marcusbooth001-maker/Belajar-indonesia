export function siteUrl(path = '/') {
  const base = import.meta.env?.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (suffix === '/') return `${prefix}/`;
  return `${prefix}${suffix}`;
}
