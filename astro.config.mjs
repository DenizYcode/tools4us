import { defineConfig } from 'astro/config';

// Served from a GitHub Pages project repo, so every link needs the base path.
export default defineConfig({
  site: 'https://denizycode.github.io',
  base: '/cisco-partner-rehberi/',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    routing: { prefixDefaultLocale: true },
  },
});
