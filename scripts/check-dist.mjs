// Checks the built site in dist/ against rules that must never regress. Run after `astro build`.
//   node scripts/check-dist.mjs
// - the dev-only graphics gallery is not published
// - every page carries the disclaimer footer (both languages on the bilingual pages)
// - every internal link and asset path starts with the site base path, and points at a page that exists
// - no requests to third-party hosts (fonts, scripts, analytics) before consent exists; the only external
//   links are <a> links to cisco.com or meraki.com that open in a new tab with rel="noopener"
// - no draft or excluded model PID is published anywhere (only rows that are ready and in scope may appear)
// - the guided selector page carries no End-of-Sale model
// - stories: both language pages exist for every published story, no draft story is published, the hub strip shows
//   only featured stories that are still fresh (at most four), every story page links a Cisco or Meraki source, and
//   no page contains an <iframe> (a video player is created by script on click, so YouTube is never contacted on load)
// - search, shortlist and migration data (the JSON files the tool pages load): present in both languages, valid JSON,
//   no draft or excluded PID, every link inside points at a page that exists, the migration list holds no current model
// - the request form: consent checkbox that is required, a honeypot, the KVKK notice linked, posts only to Web3Forms
// - analytics: the page names only the configured GoatCounter address, the vendored count.js is the pinned, reviewed
//   file, the site's own scripts contain no other web address, and no <form> posts to another host
// - warns (does not fail) while a "TO FILL" placeholder from src/lib/site-config.mjs is still on a page

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { loadCatalog } from './build-data/catalog.mjs';
import { readStories } from './build-data/stories.mjs';
import { SITE_CONFIG, TO_FILL } from '../src/lib/site-config.mjs';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// DIST_DIR lets the check run against another folder (used to prove the check fails on a broken copy).
const DIST = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : join(ROOT, 'dist');
const BASE = config.base ?? '/';
const SITE_HOST = new URL(config.site).host;
const ALLOWED_EXTERNAL = /(^|\.)(cisco|meraki)\.com$/i;
// The only other external link: the "watch on YouTube" fallback under a story video (story pages only).
const ALLOWED_VIDEO_LINK = /^(www\.)?youtube\.com$/i;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rel = (path) => relative(DIST, path).replace(/\\/g, '/');

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
    else if (!ALLOWED_EXTERNAL.test(host) && !(ALLOWED_VIDEO_LINK.test(host) && /^(tr\/yenilikler|en\/stories)\/[^/]+\/index\.html$/.test(name))) fail(`${name}: external link to ${host}`);
    else if (!/target="_blank"/.test(whole) || !/rel="[^"]*noopener/.test(whole)) fail(`${name}: external link ${url} must open in a new tab with rel="noopener"`);
  }
  if (/<iframe\b/i.test(html)) fail(`${name}: an <iframe> is in the built HTML (video players must be created on click)`);
  for (const embed of html.matchAll(/data-embed="([^"]+)"/g)) {
    if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(\?|$)/.test(embed[1])) fail(`${name}: video embed ${embed[1]} is not on youtube-nocookie.com`);
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

// Stories.
const today = new Date().toISOString().slice(0, 10);
const STORY_DIR = { tr: 'yenilikler', en: 'stories' };
const { stories: storyFiles } = readStories();
const readyStories = storyFiles.filter((s) => s.meta.status === 'ready');
for (const story of storyFiles) {
  const ready = story.meta.status === 'ready';
  for (const lang of ['tr', 'en']) {
    const page = join(DIST, lang, STORY_DIR[lang], story.meta[`slug_${lang}`] ?? '?', 'index.html');
    if (ready && !existsSync(page)) fail(`story ${story.id}: ${lang} page is missing`);
    if (!ready && existsSync(page)) fail(`story ${story.id}: a draft story is published (${lang})`);
    if (ready && existsSync(page)) {
      const html = readFileSync(page, 'utf8');
      const hasSource = [...html.matchAll(/<a\b[^>]*\bhref="(https:\/\/[^"]+)"/g)].some(([, u]) => ALLOWED_EXTERNAL.test(new URL(u).host));
      if (!hasSource) fail(`story ${story.id}: ${lang} page has no Cisco or Meraki source link`);
    }
  }
}
for (const lang of ['tr', 'en']) {
  const hub = join(DIST, lang, 'index.html');
  if (!existsSync(hub)) continue;
  const html = readFileSync(hub, 'utf8');
  const slugs = [...new Set([...html.matchAll(new RegExp(`href="${escapeRegExp(BASE)}${lang}/${STORY_DIR[lang]}/([^/"]+)/"`, 'g'))].map((m) => m[1]))];
  if (slugs.length > 4) fail(`${lang}/index.html: the hub strip shows ${slugs.length} stories (at most 4)`);
  for (const slug of slugs) {
    const story = readyStories.find((s) => s.meta[`slug_${lang}`] === slug);
    if (!story) fail(`${lang}/index.html: the hub links a story that is not published (${slug})`);
    else if (story.meta.featured !== true) fail(`${lang}/index.html: the hub shows a story that is not featured (${slug})`);
    else if (story.meta.review_by < today) fail(`${lang}/index.html: the hub shows a story past its review_by date (${slug})`);
  }
}

// Tool data files. The tool pages load these on demand, so they are part of what is published.
const DATA_FILES = ['search-index', 'shortlist-data', 'migration-data'];
for (const lang of ['tr', 'en']) {
  for (const name of DATA_FILES) {
    const where = `${lang}/${name}.json`;
    const file = join(DIST, where);
    if (!existsSync(file)) {
      fail(`${where}: missing`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      fail(`${where}: not valid JSON`);
      continue;
    }
    if (leakPattern) {
      const leak = text.match(leakPattern);
      if (leak) fail(`${where}: draft or excluded PID "${leak[0]}" is published`);
    }
    for (const [, url] of text.matchAll(/"(?:href|h|compare)":"(\/[^"]*)"/g)) {
      if (!url.startsWith(BASE)) fail(`${where}: link ${url} is missing the base path ${BASE}`);
      else if (!pageExists(url.split('#')[0].split('?')[0])) fail(`${where}: link ${url} points at a page that is not in dist`);
    }
    if (name === 'migration-data') {
      if (!Array.isArray(data) || data.length === 0) fail(`${where}: no old models`);
      else for (const e of data) if (e.lc === 'current') fail(`${where}: current model ${e.title} is in the old-model list`);
    }
    if (name === 'search-index') {
      if (!Array.isArray(data) || !data.some((e) => e.kind === 'model') || !data.some((e) => e.kind === 'story') || !data.some((e) => e.kind === 'term')) fail(`${where}: models, stories or terms are missing`);
    }
    if (name === 'shortlist-data') {
      const keys = Object.keys(data);
      if (keys.length < 100) fail(`${where}: only ${keys.length} models`);
      for (const [key, e] of Object.entries(data)) if (e.lc !== 'current' && !e.lo) fail(`${where}: ${key} is End-of-Sale without a last order date`);
    }
  }
}

// The request form: consent, honeypot, notice, and only Web3Forms as its destination.
const contactPages = { tr: ['iletisim', 'aydinlatma-metni'], en: ['contact', 'privacy-notice'] };
for (const [lang, [contact, privacy]] of Object.entries(contactPages)) {
  const file = join(DIST, lang, contact, 'index.html');
  if (!existsSync(file)) {
    fail(`${lang}/${contact}/: the request form page is missing`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (!/<input\b[^>]*\bid="c-consent"[^>]*\brequired\b/.test(html) && !/<input\b[^>]*\brequired\b[^>]*\bid="c-consent"/.test(html)) fail(`${lang}/${contact}/: the consent checkbox is missing or not required`);
  if (!/<input\b[^>]*\bname="botcheck"/.test(html)) fail(`${lang}/${contact}/: the honeypot field is missing`);
  if (!html.includes(`href="${BASE}${lang}/${privacy}/"`)) fail(`${lang}/${contact}/: the KVKK notice is not linked`);
  const endpoint = html.match(/data-endpoint="([^"]+)"/)?.[1];
  if (endpoint !== SITE_CONFIG.web3forms.endpoint) fail(`${lang}/${contact}/: the form endpoint is ${endpoint}, not ${SITE_CONFIG.web3forms.endpoint}`);
  if (!existsSync(join(DIST, lang, privacy, 'index.html'))) fail(`${lang}/${privacy}/: the KVKK notice page is missing`);
}
// No form may post to another host.
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [tag] of html.matchAll(/<form\b[^>]*>/g)) {
    const action = tag.match(/\baction="([^"]*)"/)?.[1];
    if (action && /^(https?:)?\/\//.test(action) && !action.startsWith(`https://${SITE_HOST}`)) fail(`${rel(page)}: <form> posts to ${action}`);
  }
}

// Analytics: one configured address, the reviewed script, and no other web address in the site's own scripts.
const vendor = join(DIST, 'vendor', 'goatcounter');
try {
  const source = JSON.parse(readFileSync(join(vendor, 'source.json'), 'utf8'));
  const bytes = readFileSync(join(vendor, 'count.js'));
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) fail('vendor/goatcounter/count.js is not the reviewed file (hash differs from source.json)');
} catch {
  fail('vendor/goatcounter/count.js or source.json is missing');
}
for (const page of pages) {
  const name = rel(page);
  const html = readFileSync(page, 'utf8');
  const hasAnalytics = /<body\b[^>]*\bdata-gc-endpoint=/.test(html);
  if (!hasAnalytics) {
    if (name !== 'index.html' && name !== '404.html') fail(`${name}: analytics settings are missing from <body>`);
    continue;
  }
  const endpoint = html.match(/data-gc-endpoint="([^"]+)"/)?.[1];
  if (endpoint !== SITE_CONFIG.goatcounter.endpoint) fail(`${name}: analytics endpoint is ${endpoint}, not ${SITE_CONFIG.goatcounter.endpoint}`);
  const src = html.match(/data-gc-src="([^"]+)"/)?.[1];
  if (src !== `${BASE}vendor/goatcounter/count.js`) fail(`${name}: analytics script is ${src}, not the site's own copy`);
}
const SCRIPT_URL_ALLOWED = [];
for (const file of files.filter((f) => /[\\/]_astro[\\/].*\.js$/.test(f))) {
  for (const [url] of readFileSync(file, 'utf8').matchAll(/https?:\/\/[^\s"'`)]+/g)) {
    if (!SCRIPT_URL_ALLOWED.includes(url)) fail(`${rel(file)}: the site's script names a web address (${url})`);
  }
}
const placeholders = pages.filter((p) => readFileSync(p, 'utf8').includes(TO_FILL)).map((p) => rel(p));
if (placeholders.length) console.log(`  warning: "${TO_FILL}" is still on ${placeholders.join(', ')} (fill in src/lib/site-config.mjs before launch)`);

console.log(`check:dist: ${pages.length} pages, ${files.length} files, ${internalLinks} internal links, ${published.size} published PIDs, base ${BASE}`);
if (errors.length) {
  for (const e of errors.slice(0, 60)) console.log(`  FAIL ${e}`);
  if (errors.length > 60) console.log(`  ... and ${errors.length - 60} more`);
  console.log(`check:dist FAILED with ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('check:dist passed');
