// Mobile-first check (hard rule: "check every page at 375 px wide"). Serves dist/, opens each page type in Chrome at
// 375 x 812 with phone emulation and checks what axe cannot: no horizontal scroll, a 16 px body, exactly one h1, the
// footer, and tap targets of at least 44 px. A link inside a sentence is exempt (it cannot be 44 px high without
// breaking the text), every other link, button, field and summary must be tall or wide enough.
//   node scripts/check-mobile.mjs [--only=text] [--detail]     DIST_DIR=<folder> checks another folder
// Needs Chrome. Run `npm run build` first. Exit 1 on any finding.
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { serveDist } from './serve-dist.mjs';

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7);
const detail = args.includes('--detail');

const PAGES = [
  '/tr/', '/en/', '/tr/kablosuz/', '/en/wireless/', '/tr/anahtarlama/', '/tr/yonlendirme/',
  '/tr/kablosuz/cisco-wireless-9172i/', '/tr/kablosuz/catalyst-9105axi/', '/tr/anahtarlama/c9300-48p/', '/tr/yonlendirme/c1101-4p/',
  '/tr/kablosuz/bana-model-oner/', '/tr/anahtarlama/bana-model-oner/', '/tr/yonlendirme/bana-model-oner/',
  '/tr/karsilastir/', '/tr/karsilastir/?m=catalyst-9105axi,cisco-wireless-9172i',
  '/tr/yenilikler/', '/tr/yenilikler/birlesik-lisans/', '/en/stories/unified-licensing/',
  '/tr/ara/', '/tr/ara/?q=kablosuz', '/tr/seclimlerim/', '/tr/eski-cihazim/', '/tr/eski-cihazim/?q=catalyst-9120axi',
  '/tr/sozluk/', '/tr/iletisim/', '/tr/aydinlatma-metni/', '/en/privacy-notice/',
].filter((p) => !only || p.includes(only));

const site = await serveDist(4397, process.env.DIST_DIR ?? 'dist');
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });

/** Runs in the page. Returns the findings for one page. */
function inspect() {
  const out = [];
  // The phone width, not window.innerWidth: with phone emulation an overflowing page widens the layout viewport and hides itself.
  const w = 375;
  const doc = document.documentElement;
  if (doc.scrollWidth > w + 1) {
    const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 3);
    out.push(`horizontal scroll: page is ${doc.scrollWidth} px wide (first: ${wide.map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.className ? '.' + String(e.className).split(' ')[0] : '')).join(', ') || '?'})`);
  }
  const font = parseFloat(getComputedStyle(document.body).fontSize);
  if (font < 16) out.push(`body font is ${font} px`);
  const h1 = document.querySelectorAll('h1').length;
  if (h1 !== 1) out.push(`${h1} h1 elements`);
  if (!document.querySelector('footer')) out.push('no footer');

  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const seen = new Set();
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('[hidden], [inert]')) continue;
    if (el.matches('.skip-link')) continue; // off screen until it gets focus
    let box = el;
    // A checkbox or radio is tapped through its label; the honeypot field is hidden on purpose.
    if (el.matches('input[type=checkbox], input[type=radio]')) box = el.closest('label') ?? (el.id && document.querySelector(`label[for="${el.id}"]`)) ?? el;
    const r = box.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.bottom < 0 || r.right < 0) continue;
    if (el.matches('a')) {
      // Inside a sentence: the link has text around it in the same block.
      const parent = el.parentElement;
      const around = (parent?.textContent ?? '').replace(el.textContent ?? '', '').trim();
      const inline = cs.display === 'inline' && around.length > 8;
      if (inline) continue;
    }
    if (r.height < 43.5 && r.width < 43.5) {
      const key = `${el.tagName}|${label(el)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)} px: <${el.tagName.toLowerCase()}> "${label(el)}"`);
    } else if (r.height < 43.5 && el.matches('button, input, select, textarea, summary')) {
      const key = `${el.tagName}|${label(el)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`tap target ${Math.round(r.width)}x${Math.round(r.height)} px high: <${el.tagName.toLowerCase()}> "${label(el)}"`);
    }
  }
  return out;
}

const rows = [];
let failed = false;
try {
  for (const path of PAGES) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    try {
      const response = await page.goto(`${site.origin}${path}`, { waitUntil: 'networkidle0' });
      if (response?.status() !== 200) throw new Error(`answered ${response?.status()}`);
      const findings = await page.evaluate(inspect);
      if (findings.length) failed = true;
      rows.push({ page: path, findings: findings.length, result: findings.length ? 'FAIL' : 'ok' });
      for (const f of findings.slice(0, detail ? 50 : 6)) console.log(`  ${path}: ${f}`);
    } catch (error) {
      failed = true;
      rows.push({ page: path, findings: -1, result: 'ERROR' });
      console.log(`  ${path}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.disconnect();
  await chrome.kill();
  site.close();
}
console.table(rows);
console.log(failed ? 'check:mobile FAILED' : `check:mobile passed (${rows.length} pages at 375 px: no horizontal scroll, 16 px body, one h1, footer, tap targets 44 px)`);
process.exit(failed ? 1 : 0);
