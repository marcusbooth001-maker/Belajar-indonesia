import { defineConfig } from 'astro/config';

// SITE and BASE_PATH still override these. The public site is the portal host.
const site = (process.env.SITE || 'https://belajar.itsmyship.com').replace(/\/$/, '');
const rawBase = process.env.BASE_PATH ?? '/';
const base = rawBase === '' || rawBase === '/' ? '/' : `/${String(rawBase).replace(/^\/|\/$/g, '')}`;

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  server: { host: true },
});
