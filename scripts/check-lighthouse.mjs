// Mobile Lighthouse run over the built dist/ (SPEC "Done when": 90+ performance and accessibility on the hub, a family
// page and a story). Serves dist/ itself (same base path as Pages), runs Lighthouse with its default
// mobile emulation and simulated slow 4G, prints a table and exits 1 if a page is below the limit.
// Usage: node scripts/check-lighthouse.mjs [--all] [--min=90] [--url=/tr/kablosuz/]
// Needs Chrome (CHROME_PATH, or the usual install). Run `npm run build` first.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const BASE = '/tools4us';
const PORT = 4399;
const args = process.argv.slice(2);
const min = Number((args.find((a) => a.startsWith('--min=')) ?? '--min=90').split('=')[1]);
const only = args.filter((a) => a.startsWith('--url=')).map((a) => a.split('=')[1]);

// The three pages the SPEC names come first; --all adds the other page types, in both languages where it matters.
const CORE = ['/tr/', '/tr/kablosuz/', '/tr/yenilikler/birlesik-lisans/'];
const MORE = [
  '/en/',
  '/tr/anahtarlama/',
  '/tr/yonlendirme/',
  '/tr/kablosuz/catalyst-9105axi/',
  '/tr/anahtarlama/c1200-16p-2g/',
  '/tr/yenilikler/',
  '/tr/kablosuz/bana-model-oner/',
  '/tr/karsilastir/',
  '/tr/seclimlerim/',
  '/tr/eski-cihazim/',
  '/tr/iletisim/',
  '/tr/ara/',
  '/tr/sozluk/',
  '/en/stories/unified-licensing/',
  '/en/wireless/',
];
const pages = only.length ? only : args.includes('--all') ? [...CORE, ...MORE] : CORE;

// Static server for dist/ under the Pages base path. Text files are gzipped like GitHub Pages does, so transfer sizes
// (and the Lighthouse network score) are realistic.
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(BASE + '/')) { res.writeHead(404).end('not found'); return; }
  path = path.slice(BASE.length);
  if (path.endsWith('/')) path += 'index.html';
  const file = join('dist', normalize(path));
  if (!file.startsWith('dist') || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404, { 'content-type': TYPES['.html'] }).end(existsSync('dist/404.html') ? readFileSync('dist/404.html') : 'not found'); return; }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const body = readFileSync(file);
  const headers = { 'content-type': type, 'cache-control': 'max-age=600' };
  if (/^(text\/|application\/json|image\/svg)/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
    headers['content-encoding'] = 'gzip';
    res.writeHead(200, headers).end(gzipSync(body));
  } else res.writeHead(200, headers).end(body);
});
await new Promise((r) => server.listen(PORT, r));
const stop = () => server.close();

if (!existsSync('dist/index.html')) {
  console.error('dist/ is missing: run npm run build first');
  process.exit(1);
}
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows = [];
let failed = false;
try {
  for (const p of pages) {
    const url = `http://localhost:${PORT}${BASE}${p}`;
    const res = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
    const lhr = res.lhr;
    if (lhr.runtimeError) throw new Error(`${p}: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`);
    const score = (c) => Math.round((lhr.categories[c]?.score ?? 0) * 100);
    const a = lhr.audits;
    const row = {
      page: p,
      perf: score('performance'),
      a11y: score('accessibility'),
      bp: score('best-practices'),
      seo: score('seo'),
      lcp: ((a['largest-contentful-paint'].numericValue ?? 0) / 1000).toFixed(1),
      tbt: Math.round(a['total-blocking-time'].numericValue ?? 0),
      cls: Number((a['cumulative-layout-shift'].numericValue ?? 0).toFixed(3)),
      kb: Math.round((a['total-byte-weight'].numericValue ?? 0) / 1024),
    };
    row.pass = row.perf >= min && row.a11y >= min;
    if (!row.pass) failed = true;
    rows.push(row);
    if (!row.pass || args.includes('--detail')) {
      for (const it of [...(a['layout-shift-elements']?.details?.items ?? []), ...(a['layout-shifts']?.details?.items ?? [])]) console.log(`  ${p} [cls] ${it.node?.selector} ${it.score?.toFixed?.(3)}`);
      for (const c of ['performance', 'accessibility']) {
        for (const ref of lhr.categories[c].auditRefs) {
          const au = a[ref.id];
          if (au.score !== null && au.score < 0.9 && ref.weight > 0) {
            console.log(`  ${p} [${c}] ${ref.id}: ${au.score} ${au.displayValue ?? ''}`);
            for (const it of (au.details?.items ?? []).slice(0, 5)) console.log(`      ${it.node?.selector ?? it.url ?? ''} | ${(it.node?.explanation ?? it.node?.snippet ?? '').replace(/s+/g, ' ').slice(0, 260)}`);
          }
        }
      }
    }
  }
} finally {
  await chrome.kill();
  stop();
}
console.table(rows.map((r) => ({ ...r, pass: r.pass ? 'ok' : 'FAIL' })));
console.log(failed ? `check:lighthouse FAILED (limit ${min})` : `check:lighthouse passed (limit ${min}, ${rows.length} pages)`);
process.exit(failed ? 1 : 0);
