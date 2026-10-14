// One-off: renders the social preview (1200 x 630) and the touch icon (180 x 180) from the site's own colours and the
// self-hosted Inter font, with Chrome. Original drawings only: no Cisco logo, no photos, no assets from other sites.
// The PNGs are committed in public/; run this again only when the look changes.
//   node scripts/make-brand-assets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const font = readFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2').toString('base64');
const fontExt = readFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2').toString('base64');
const navy = '#0a1f44';
const navy2 = '#14305f';
const teal = '#4fd1de';
const faces = `
  @font-face { font-family: 'Inter Variable'; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  @font-face { font-family: 'Inter Variable'; font-weight: 100 900; src: url(data:font/woff2;base64,${fontExt}) format('woff2'); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }`;

// Three plain devices drawn like the site's own graphics: a switch, an access point, a router.
const devices = `
  <g fill="${navy2}" stroke="${teal}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(70 0)">
      <rect x="0" y="0" width="250" height="64" rx="10"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${20 + i * 26}" y="22" width="16" height="20" rx="3" fill="${navy}"/>`).join('')}
    </g>
    <g transform="translate(400 0)">
      <rect x="20" y="0" width="150" height="46" rx="23"/>
      <circle cx="95" cy="23" r="5" fill="${teal}"/>
      <path d="M45 76 q50 -34 100 0" fill="none"/><path d="M65 96 q30 -20 60 0" fill="none"/>
    </g>
    <g transform="translate(680 0)">
      <rect x="0" y="12" width="230" height="52" rx="10"/>
      <path d="M30 12 L18 -22 M200 12 L212 -22" fill="none"/>
      <circle cx="40" cy="38" r="6" fill="${teal}"/><circle cx="64" cy="38" r="6" fill="${navy}"/><circle cx="88" cy="38" r="6" fill="${navy}"/>
    </g>
  </g>`;

const social = `<!doctype html><meta charset="utf-8"><style>${faces}
  html, body { margin: 0; width: 1200px; height: 630px; background: ${navy}; font-family: 'Inter Variable', sans-serif; color: #fff; }
  .wrap { position: relative; width: 1200px; height: 630px; box-sizing: border-box; padding: 76px 80px; }
  h1 { margin: 0; font-size: 136px; line-height: 1; font-weight: 800; letter-spacing: -3px; }
  h1 span { color: ${teal}; }
  p { margin: 26px 0 0; font-size: 33px; line-height: 1.4; color: #c5d3ea; max-width: 1060px; }
  .fine { position: absolute; left: 80px; bottom: 52px; font-size: 26px; color: #8fa4c8; }
  svg { position: absolute; left: 130px; top: 390px; }
</style><div class="wrap">
  <h1>Tools<span>4</span>Us</h1>
  <p>Switching, wireless ve routing için bağımsız model rehberi<br>An independent model guide for switching, wireless and routing</p>
  <svg width="980" height="150" viewBox="0 0 980 150"><g transform="translate(0 34)">${devices}</g></svg>
  <div class="fine">Kişisel ve bağımsız bir rehberdir · A personal, independent guide, not an official site</div>
</div>`;

const icon = `<!doctype html><meta charset="utf-8"><style>${faces}
  html, body { margin: 0; width: 180px; height: 180px; background: ${navy}; }
  div { width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; font: 800 128px/1 'Inter Variable', sans-serif; color: ${teal}; }
</style><div>4</div>`;

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--hide-scrollbars'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
  for (const [html, width, height, out] of [
    [social, 1200, 630, 'public/social-preview.png'],
    [icon, 180, 180, 'public/apple-touch-icon.png'],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(out, await page.screenshot({ type: 'png' }));
    await page.close();
    console.log(`wrote ${out} (${width} x ${height})`);
  }
} finally {
  await browser.disconnect();
  await chrome.kill();
}
