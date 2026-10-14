// Accessibility pass over the built dist/ (SPEC "Constraints": WCAG 2.1 AA). Serves dist/, drives Chrome with
// puppeteer-core and runs axe-core (WCAG 2 A/AA and 2.1 A/AA rules) on every page type at 375 px and 1280 px,
// in the states a visitor reaches by clicking (filter sheet open, comparison table, shortlist with items, selector
// result, form with errors). It also walks the Tab order and reports a stop with no visible focus indicator.
// Exits 1 on any axe violation or invisible focus. Usage: node scripts/check-a11y.mjs [--only=text] [--detail]
// DIST_DIR=<folder> checks another folder. Needs Chrome (CHROME_PATH or the usual install). Run `npm run build` first.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { serveDist } from './serve-dist.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7);
const detail = args.includes('--detail');

const VIEWPORTS = [
  { name: '375', width: 375, height: 812, mobile: true },
  { name: '1280', width: 1280, height: 800, mobile: false },
];

const W = ['catalyst-9105axi', 'cisco-wireless-9172i']; // wireless, one End-of-Sale and one current
const S = ['c1300-16p-2g', 'c1300-12xt-2x'];

const clickIf = async (page, selector) => {
  const el = await page.$(selector);
  if (el) await el.click();
  return Boolean(el);
};
const settle = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// Each state: a name, a path, and an optional script that brings the page into the state to test.
const STATES = [
  { name: 'hub tr', path: '/tr/' },
  { name: 'hub en', path: '/en/' },
  { name: 'wireless family', path: '/tr/kablosuz/' },
  { name: 'wireless family en', path: '/en/wireless/' },
  {
    name: 'wireless filter sheet open',
    path: '/tr/kablosuz/',
    only: 'mobile',
    expect: () => document.getElementById('filter-sheet')?.classList.contains('open'),
    run: async (page) => {
      await page.click('#filters-open');
      await settle(500);
    },
  },
  {
    name: 'wireless filter + compare tray',
    path: '/tr/kablosuz/',
    expect: () => document.querySelector('#tray') && !document.querySelector('#tray').hidden && document.querySelectorAll('#filter-form input:checked').length > 0,
    run: async (page, vp) => {
      if (vp.mobile) {
        await page.click('#filters-open');
        await settle(500);
      }
      const box = await page.$('#filter-form input[type=checkbox]');
      if (!box) throw new Error('no filter checkbox to click');
      await box.evaluate((el) => el.click());
      await settle(200);
      if (vp.mobile) {
        await page.keyboard.press('Escape');
        await settle(400);
      }
      const boxes = await page.$$('.cmp-box');
      for (const b of boxes.slice(0, 2)) await b.evaluate((el) => el.click());
      await settle(300);
    },
  },
  { name: 'switching family', path: '/tr/anahtarlama/' },
  { name: 'routing family', path: '/tr/yonlendirme/' },
  { name: 'model page current', path: '/tr/kablosuz/cisco-wireless-9172i/' },
  { name: 'model page end-of-sale', path: `/tr/kablosuz/${W[0]}/` },
  { name: 'model page switching with builder', path: '/tr/anahtarlama/c9300-48p/' },
  { name: 'model page routing', path: '/tr/yonlendirme/c1101-4p/' },
  { name: 'selector wireless', path: '/tr/kablosuz/bana-model-oner/' },
  {
    name: 'selector result',
    path: '/tr/anahtarlama/bana-model-oner/',
    expect: () => document.querySelectorAll('#selector-results a[href]').length > 0,
    run: async (page) => {
      await page.click('#selector-form button[type=submit]');
      await settle(400);
    },
  },
  { name: 'compare empty', path: '/tr/karsilastir/' },
  { name: 'compare table', path: `/tr/karsilastir/?m=${W.join(',')}` },
  { name: 'compare switching', path: `/tr/karsilastir/?f=switching&m=${S.join(',')}` },
  { name: 'stories index', path: '/tr/yenilikler/' },
  { name: 'story', path: '/tr/yenilikler/birlesik-lisans/' },
  { name: 'story en', path: '/en/stories/unified-licensing/' },
  { name: 'search empty', path: '/tr/ara/' },
  { name: 'search results', path: '/tr/ara/?q=kablosuz', expect: () => document.querySelectorAll('main li a[href]').length > 0 },
  { name: 'search no result', path: '/tr/ara/?q=zzzzqx' },
  { name: 'shortlist empty', path: '/tr/seclimlerim/' },
  {
    name: 'shortlist with items',
    path: '/tr/kablosuz/cisco-wireless-9172i/',
    expect: () => document.querySelectorAll('main li').length > 0 && !document.querySelector('.empty, [data-empty]:not([hidden])') && Object.keys(localStorage).length > 0,
    run: async (page) => {
      await page.click('.sl-btn');
      await settle(300);
      await page.goto(page.url().replace(/kablosuz\/.*$/, 'seclimlerim/'), { waitUntil: 'networkidle0' });
    },
  },
  { name: 'migration finder', path: '/tr/eski-cihazim/' },
  { name: 'migration result', path: '/tr/eski-cihazim/?q=catalyst-9120axi', expect: () => document.querySelectorAll('main a[href*="/kablosuz/"]').length > 0 },
  { name: 'glossary', path: '/tr/sozluk/' },
  { name: 'contact form', path: '/tr/iletisim/' },
  {
    name: 'contact form with errors',
    path: '/tr/iletisim/',
    expect: () => Boolean(document.querySelector('form :invalid')) && document.activeElement?.matches(':invalid'),
    run: async (page) => {
      await settle(3200);
      const submit = await page.$('form button[type=submit]');
      if (submit) await submit.click();
      await settle(300);
    },
  },
  { name: 'privacy notice', path: '/tr/aydinlatma-metni/' },
  { name: 'privacy notice en', path: '/en/privacy-notice/' },
  { name: '404', path: '/tr/yok-boyle-bir-sayfa/' },
].filter((s) => !only || s.name.includes(only) || s.path.includes(only));

const site = await serveDist(4398, process.env.DIST_DIR ?? 'dist');
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });

/** Tab through the page; return the stops whose focus is not visible. */
async function tabAudit(page, limit = 80) {
  const problems = [];
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  const seen = new Set();
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const marked = (node) => {
        const c = getComputedStyle(node);
        return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== 'none');
      };
      // Cards draw the focus ring on the card (:has(a:focus-visible)), so look at the nearest ancestors too.
      let visible = marked(el);
      const outlined = (node) => getComputedStyle(node).outlineStyle !== 'none' && parseFloat(getComputedStyle(node).outlineWidth) > 0;
      for (let up = el.parentElement, n = 0; !visible && up && n < 4; up = up.parentElement, n++) visible = outlined(up);
      const r = el.getBoundingClientRect();
      const id = el.id || `${el.tagName}.${el.className}|${(el.textContent || '').trim().slice(0, 30)}|${Math.round(r.x)},${Math.round(r.y)}`;
      return { id, visible, size: [Math.round(r.width), Math.round(r.height)], tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) };
    });
    if (!info) continue;
    if (seen.has(info.id)) break;
    seen.add(info.id);
    if (!info.visible) problems.push(`no focus indicator on <${info.tag}> "${info.text}"`);
  }
  return problems;
}

const rows = [];
let failed = false;
try {
  for (const vp of VIEWPORTS) {
    for (const state of STATES) {
      if (state.only === 'mobile' && !vp.mobile) continue;
      // A fresh context per state, so a shortlist saved by one state never leaks into the next.
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      try {
        const response = await page.goto(`${site.origin}${state.path}`, { waitUntil: 'networkidle0' });
        const expected = state.path.includes('yok-boyle') ? 404 : 200;
        if (response?.status() !== expected) throw new Error(`${state.path} answered ${response?.status()}, expected ${expected}`);
        if (state.run) await state.run(page, vp);
        // The state must really have been reached: a silently skipped click would test the wrong page.
        if (state.expect && !(await page.evaluate(state.expect))) throw new Error(`state "${state.name}" was not reached`);
        await page.evaluate(axeSource);
        const result = await page.evaluate(() =>
          // eslint-disable-next-line no-undef
          axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }),
        );
        const tabs = state.path.includes('yok-boyle') ? [] : await tabAudit(page);
        const v = result.violations;
        const impact = (n) => v.filter((x) => x.impact === n).length;
        const bad = v.length > 0 || tabs.length > 0 || errors.length > 0;
        if (bad) failed = true;
        rows.push({ viewport: vp.name, state: state.name, violations: v.length, critical: impact('critical'), serious: impact('serious'), focus: tabs.length, jsErrors: errors.length, result: bad ? 'FAIL' : 'ok' });
        if (bad) {
          for (const x of v) {
            console.log(`  [${vp.name}] ${state.name}: ${x.id} (${x.impact}) ${x.help}`);
            for (const n of x.nodes.slice(0, detail ? 10 : 3)) console.log(`      ${n.target.join(' ')} | ${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 220)}`);
          }
          for (const t of tabs) console.log(`  [${vp.name}] ${state.name}: ${t}`);
          for (const e of errors) console.log(`  [${vp.name}] ${state.name}: page error ${e}`);
        }
      } catch (error) {
        failed = true;
        rows.push({ viewport: vp.name, state: state.name, violations: -1, critical: 0, serious: 0, focus: 0, jsErrors: 0, result: 'ERROR' });
        console.log(`  [${vp.name}] ${state.name}: ${error.message}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.disconnect();
  await chrome.kill();
  site.close();
}
console.table(rows);
console.log(failed ? 'check:a11y FAILED' : `check:a11y passed (${rows.length} page states, axe WCAG 2.1 A/AA, Tab focus visible)`);
process.exit(failed ? 1 : 0);
