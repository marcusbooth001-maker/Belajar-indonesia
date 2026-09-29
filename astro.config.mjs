import { defineConfig } from 'astro/config';

// GitHub Pages project sites use the repository name, including its capitalisation.
// Actions passes BASE_PATH from actions/configure-pages (steps.pages.outputs.base_path).
const site = (process.env.SITE || 'https://marcusbooth001-maker.github.io').replace(/\/$/, '');
const rawBase = process.env.BASE_PATH ?? '/Belajar-indonesia';
const base = rawBase === '' || rawBase === '/' ? '/' : `/${String(rawBase).replace(/^\/|\/$/g, '')}`;

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  server: { host: true },
});
