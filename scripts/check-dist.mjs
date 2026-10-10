// Checks the built site in dist/ against rules that must never regress. Run after `astro build`.
//   node scripts/check-dist.mjs
// - the dev-only graphics gallery is not published
// - every page carries the disclaimer footer (both languages on the bilingual pages)
// - every internal link and asset path starts with the site base path, and points at a page that exists
// - no requests to third-party hosts (fonts, scripts, analytics) before consent exists; the only external
//   links are <a> links to cisco.com or meraki.com that open in a new tab with rel="noopener"
// - no draft or excluded model PID is published anywhere (only rows that are ready and in scope may appear)
// - the guided selector page carries no End-of-Sale model

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { loadCatalog } from './build-data/catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// DIST_DIR lets the check run against another folder (used to prove the check fails on a broken copy).
const DIST = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : join(ROOT, 'dist');
const BASE = config.base ?? '/';
const SITE_HOST = new URL(config.site).host;
const ALLOWED_EXTERNAL = /(^|\.)(cisco|meraki)\.com$/i;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// PIDs that must never appear: every model and accessory in the workbooks that is not ready and in scope.
const { catalog } = await loadCatalog();
const published = new Set();
const hidden = new Set();
for (const sheets of Object.values(catalog.families)) {
  for (const row of [...sheets.models, ...sheets.accessories]) {
    if (!row.pid) continue;
    (row.status === 'ready' && row.scope !== 'excluded' ? published : hidden).add(row.pid);
  }
}
for (const pid of published) hidden.delete(pid);
// A draft PID counts as a leak only as a whole token ("C9105" inside "C9105AXI" is not a hit).
const leakPattern = hidden.size ? new RegExp(`(?<![A-Za-z0-9_-])(?:${[...hidden].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})(?![A-Za-z0-9_-])`) : null;

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const errors = [];
const fail = (msg) => errors.push(msg);

for (const f of files) if (/gallery/i.test(relative(DIST, f))) fail(`dev-only file published: ${relative(DIST, f)}`);

function pageExists(path) {
  const rel = decodeURIComponent(path.slice(BASE.length));
  const target = join(DIST, rel);
  return existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
}

let internalLinks = 0;
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
    else {
      internalLinks += 1;
      const clean = url.split('#')[0].split('?')[0];
      if (clean !== BASE && !pageExists(clean)) fail(`${name}: ${attr}="${url}" points at a page that is not in dist`);
    }
  }

  // External: only plain links to Cisco or Meraki, opened in a new tab. Nothing is fetched from another host.
  for (const tag of html.matchAll(/<(a|link|script|img|iframe|source|video)\b[^>]*\b(?:href|src)="(https?:\/\/[^"]+)"[^>]*>/g)) {
    const [whole, element, url] = tag;
    const host = new URL(url).host;
    if (host === SITE_HOST) continue;
    if (element !== 'a') fail(`${name}: third-party request ${url} (<${element}>)`);
    else if (!ALLOWED_EXTERNAL.test(host)) fail(`${name}: external link to ${host}`);
    else if (!/target="_blank"/.test(whole) || !/rel="[^"]*noopener/.test(whole)) fail(`${name}: external link ${url} must open in a new tab with rel="noopener"`);
  }
  for (const css of html.matchAll(/url\((https?:\/\/[^)]+)\)/g)) fail(`${name}: third-party CSS url ${css[1]}`);

  if (leakPattern) {
    const leak = html.match(leakPattern);
    if (leak) fail(`${name}: draft or excluded PID "${leak[0]}" is published`);
  }

  // The selector page embeds the models it can suggest. None may be End-of-Sale.
  if (/\/(bana-model-oner|find-my-model)\/index\.html$/.test(`/${name}`)) {
    const data = html.match(/<script type="application\/json" id="selector-cards">([\s\S]*?)<\/script>/);
    if (!data) fail(`${name}: selector data not found`);
    else if (/"lifecycle":"(eos_announced|eos)"/.test(data[1])) fail(`${name}: an End-of-Sale model is embedded in the selector`);
    else if (!/"lifecycle":"current"/.test(data[1])) fail(`${name}: the selector has no current model`);
  }
}

console.log(`check:dist: ${pages.length} pages, ${files.length} files, ${internalLinks} internal links, ${published.size} published PIDs, base ${BASE}`);
if (errors.length) {
  for (const e of errors.slice(0, 60)) console.log(`  FAIL ${e}`);
  if (errors.length > 60) console.log(`  ... and ${errors.length - 60} more`);
  console.log(`check:dist FAILED with ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('check:dist passed');
