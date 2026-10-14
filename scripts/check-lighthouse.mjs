// Mobile Lighthouse run over the built dist/ (SPEC "Done when": 90+ performance and accessibility on the hub, a family
// page and a story). Serves dist/ itself (same base path as Pages), runs Lighthouse with its default
// mobile emulation and simulated slow 4G, prints a table and exits 1 if a page is below the limit.
// Usage: node scripts/check-lighthouse.mjs [--all] [--min=90] [--url=/tr/kablosuz/]
// Needs Chrome (CHROME_PATH, or the usual install). Run `npm run build` first.
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { serveDist } from './serve-dist.mjs';

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

const site = await serveDist(PORT, process.env.DIST_DIR ?? 'dist');
const stop = () => site.close();

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows = [];
let failed = false;
try {
  for (const p of pages) {
    const url = `${site.origin}${p}`;
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
