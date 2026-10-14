import { defineConfig } from 'astro/config';
import sitemap from './src/integrations/sitemap.mjs';

const site = 'https://denizycode.github.io';
const base = '/tools4us/';

// Served from a GitHub Pages project repo, so every link needs the base path.
export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    routing: { prefixDefaultLocale: true },
  },
  integrations: [sitemap({ site, base })],
});
