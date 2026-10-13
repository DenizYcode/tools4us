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

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { loadCatalog } from './build-data/catalog.mjs';
import { readStories } from './build-data/stories.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// DIST_DIR lets the check run against another folder (used to prove the check fails on a broken copy).
const DIST = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : join(ROOT, 'dist');
const BASE = config.base ?? '/';
const SITE_HOST = new URL(config.site).host;
const ALLOWED_EXTERNAL = /(^|\.)(cisco|meraki)\.com$/i;
// The only other external link: the "watch on YouTube" fallback under a story video.
const ALLOWED_VIDEO_LINK = /^(www\.)?youtube\.com$/i;

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
    else if (!ALLOWED_EXTERNAL.test(host) && !ALLOWED_VIDEO_LINK.test(host)) fail(`${name}: external link to ${host}`);
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

console.log(`check:dist: ${pages.length} pages, ${files.length} files, ${internalLinks} internal links, ${published.size} published PIDs, base ${BASE}`);
if (errors.length) {
  for (const e of errors.slice(0, 60)) console.log(`  FAIL ${e}`);
  if (errors.length > 60) console.log(`  ... and ${errors.length - 60} more`);
  console.log(`check:dist FAILED with ${errors.length} problem(s)`);
  process.exit(1);
}
console.log('check:dist passed');
