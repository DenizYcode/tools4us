// Checks the built site in dist/ against rules that must never regress. Run after `astro build`.
//   node scripts/check-dist.mjs
// - the dev-only graphics gallery is not published
// - every page carries the disclaimer footer (both languages on the bilingual pages)
// - every internal link and asset path starts with the site base path
// - no requests to third-party hosts (fonts, scripts, analytics) before consent exists
// - no model PIDs or product listings: nothing is published until rows are ready

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = config.base ?? '/';
const SITE_HOST = new URL(config.site).host;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const errors = [];
const fail = (msg) => errors.push(msg);

for (const f of files) if (/gallery/i.test(relative(DIST, f))) fail(`dev-only file published: ${relative(DIST, f)}`);

for (const page of pages) {
  const name = relative(DIST, page).replace(/\\/g, '/');
  const html = readFileSync(page, 'utf8');
  const hasTr = html.includes('ticari markalarıdır');
  const hasEn = html.includes('are trademarks of Cisco Systems');
  const bilingual = name === 'index.html' || name === '404.html';
  if (bilingual ? !(hasTr && hasEn) : !(hasTr || hasEn)) fail(`${name}: disclaimer footer missing`);
  if (!/<footer[\s>]/.test(html)) fail(`${name}: no <footer>`);

  for (const [, attr, url] of html.matchAll(/\b(href|src)="(\/[^"]*)"/g)) {
    if (url.startsWith('//')) fail(`${name}: protocol-relative URL ${url}`);
    else if (!url.startsWith(BASE)) fail(`${name}: ${attr}="${url}" is missing the base path ${BASE}`);
  }
  for (const [, url] of html.matchAll(/\b(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    if (new URL(url).host !== SITE_HOST) fail(`${name}: third-party request ${url}`);
  }
  for (const css of html.matchAll(/url\((https?:\/\/[^)]+)\)/g)) fail(`${name}: third-party CSS url ${css[1]}`);
  if (/\b(CW9\d{3}|C9[1-6]\d{2}[A-Z]?|N9K-|ISR1\d{3}|C11\d{2}|MX\d{2,3}\b)/.test(html.replace(/Meraki MX/g, ''))) fail(`${name}: looks like a model PID is published`);
}

console.log(`check:dist: ${pages.length} pages, ${files.length} files, base ${BASE}`);
if (errors.length) {
  for (const e of errors) console.log(`  FAIL ${e}`);
  console.log(`check:dist FAILED with ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('check:dist passed');
