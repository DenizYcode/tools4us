// Writes dist/sitemap.xml after the build, from the pages that were really built. A page that carries a noindex tag,
// the 404 page and the root redirect are left out, so the sitemap never lists something the page itself says to skip.
// No lastmod: the build date is not the date a page's content changed, and a wrong date is worse than none.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @param {{ site: string, base: string }} options */
export default function sitemap({ site, base }) {
  return {
    name: 'tools4us-sitemap',
    hooks: {
      'astro:build:done': ({ dir, pages }) => {
        const root = fileURLToPath(dir);
        const urls = [];
        for (const { pathname } of pages) {
          if (pathname === '' || pathname === '404/' || pathname.startsWith('404')) continue;
          const file = join(root, pathname, 'index.html');
          if (!existsSync(file)) continue;
          if (/<meta name="robots" content="[^"]*noindex/.test(readFileSync(file, 'utf8'))) continue;
          urls.push(new URL(`${base.replace(/\/$/, '')}/${pathname}`, site).href);
        }
        urls.sort();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
        writeFileSync(join(root, 'sitemap.xml'), xml);
        console.log(`sitemap.xml: ${urls.length} pages`);
      },
    },
  };
}
