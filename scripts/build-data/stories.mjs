// Stories (SPEC "Content hub and stories" and "Story file format"): one Markdown file per story in
// content/stories/. The frontmatter is YAML with both languages; the body has a <!-- tr --> and an
// <!-- en --> section. This module reads the files, checks them against the SPEC build checks and
// returns the published stories for the site. Only `status: ready` stories are published.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ROOT } from './catalog.mjs';
import { extractLinks, isAllowedLink } from '../../src/lib/markdown.mjs';

export const STORIES_DIR = join(ROOT, 'content', 'stories');
export const CATEGORIES = ['new', 'licence', 'security', 'family', 'event'];
export const LAUNCH_FAMILIES = ['switching', 'wireless', 'routing'];
export const MAX_FEATURED = 4;
export const MIN_FEATURED = 3;
export const REVIEW_DAYS = 90;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const TEXT_FIELDS = ['slug_tr', 'slug_en', 'title_tr', 'title_en', 'teaser_tr', 'teaser_en', 'why_tr', 'why_en'];

const isDate = (v) => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v));
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Splits a story file into frontmatter and the two language sections. Throws on a malformed file. */
export function parseStoryFile(source) {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('no YAML frontmatter between --- lines');
  const meta = parseYaml(m[1]);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('frontmatter is not a mapping');
  const parts = m[2].split(/^<!--\s*(tr|en)\s*-->\s*$/m);
  const preamble = parts[0].trim();
  const body = { tr: '', en: '' };
  for (let i = 1; i < parts.length; i += 2) {
    if (body[parts[i]]) throw new Error(`the <!-- ${parts[i]} --> section appears twice`);
    body[parts[i]] = parts[i + 1].trim();
  }
  if (preamble) throw new Error('text before the first <!-- tr --> or <!-- en --> marker');
  return { meta, body };
}

/** Reads every content/stories/*.md. Returns { stories, problems }. */
export function readStories(dir = STORIES_DIR) {
  const problems = [];
  const stories = [];
  if (!existsSync(dir)) return { stories, problems };
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
    try {
      const { meta, body } = parseStoryFile(readFileSync(join(dir, name), 'utf8'));
      stories.push({ id: name.replace(/\.md$/, ''), file: `content/stories/${name}`, meta, body });
    } catch (e) {
      problems.push({ level: 'error', code: 'STORY_PARSE', message: `content/stories/${name}: ${e.message}` });
    }
  }
  return { stories, problems };
}

// The catalog PIDs a story may point at, and which of them are ready and current.
function modelIndex(catalog) {
  const all = new Map();
  for (const sheets of Object.values(catalog.families)) {
    for (const row of sheets.models ?? []) {
      if (row.pid) all.set(row.pid, { published: row.status === 'ready' && row.scope !== 'excluded', lifecycle: row.lifecycle });
    }
  }
  return all;
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Checks the stories against the catalog. Returns { errors, warnings, stats }. */
export function validateStories(stories, catalog, { today = todayIso() } = {}) {
  const errors = [];
  const warnings = [];
  const err = (s, code, message) => errors.push({ code, message: `${s.file}: ${message}` });
  const warn = (s, code, message) => warnings.push({ code, message: `${s.file}: ${message}` });
  const models = modelIndex(catalog);
  const slugs = { tr: new Map(), en: new Map() };
  const featuredOrders = new Map();
  let featured = 0;

  for (const s of stories) {
    const m = s.meta;
    const ready = m.status === 'ready';
    if (!['draft', 'ready'].includes(m.status)) err(s, 'STORY_STATUS', `status must be draft or ready (got "${m.status ?? ''}")`);
    if (!CATEGORIES.includes(m.category)) err(s, 'STORY_CATEGORY', `category must be one of ${CATEGORIES.join(', ')} (got "${m.category ?? ''}")`);

    for (const lang of ['tr', 'en']) {
      const slug = m[`slug_${lang}`];
      if (blank(slug)) continue;
      if (!SLUG.test(slug)) err(s, 'STORY_SLUG', `slug_${lang} "${slug}" must be lower-case letters, digits and hyphens`);
      if (slugs[lang].has(slug)) err(s, 'STORY_SLUG_DUPLICATE', `slug_${lang} "${slug}" is also used by ${slugs[lang].get(slug)}`);
      else slugs[lang].set(slug, s.file);
    }

    // Structure that holds for drafts too.
    const pids = m.related_pids ?? [];
    if (!Array.isArray(pids)) err(s, 'STORY_PIDS', 'related_pids must be a list');
    else {
      for (const pid of pids) {
        const model = models.get(pid);
        if (!model) err(s, 'STORY_PID_UNKNOWN', `related PID ${pid} is not in the catalog`);
        else if (ready && !(model.published && model.lifecycle === 'current')) {
          err(s, 'STORY_PID_NOT_CURRENT', `related PID ${pid} is not a ready, current model (a story never points at a draft or End-of-Sale model)`);
        }
      }
    }
    if (!blank(m.video_youtube_id) && !YOUTUBE_ID.test(m.video_youtube_id)) err(s, 'STORY_VIDEO', `video_youtube_id "${m.video_youtube_id}" is not an 11-character YouTube ID`);
    if (!blank(m.cta_family) && !LAUNCH_FAMILIES.includes(m.cta_family)) err(s, 'STORY_CTA', `cta_family must be one of ${LAUNCH_FAMILIES.join(', ')}`);

    const sources = m.sources ?? [];
    if (!Array.isArray(sources)) err(s, 'STORY_SOURCES', 'sources must be a list of { title, url }');
    for (const src of Array.isArray(sources) ? sources : []) {
      if (blank(src?.title) || blank(src?.url)) err(s, 'STORY_SOURCES', 'every source needs a title and a url');
      else if (!isAllowedLink(src.url)) err(s, 'STORY_SOURCE_HOST', `source ${src.url} must be https on cisco.com or meraki.com`);
    }
    for (const lang of ['tr', 'en']) {
      for (const link of extractLinks(s.body[lang])) {
        if (!isAllowedLink(link.url)) err(s, 'STORY_LINK', `link in the ${lang} body ${link.url} must be https on cisco.com or meraki.com`);
      }
    }

    if (!ready) continue;

    // Rules for published stories.
    for (const f of TEXT_FIELDS) if (blank(m[f])) err(s, 'STORY_REQUIRED', `required field ${f} is empty`);
    for (const lang of ['tr', 'en']) if (blank(s.body[lang])) err(s, 'STORY_BODY', `the <!-- ${lang} --> body section is empty`);
    for (const f of ['published_date', 'last_verified', 'review_by']) {
      if (blank(m[f])) err(s, 'STORY_REQUIRED', `required field ${f} is empty`);
      else if (!isDate(m[f])) err(s, 'STORY_DATE', `${f} "${m[f]}" is not a date (YYYY-MM-DD)`);
    }
    if (isDate(m.last_verified) && m.last_verified > today) err(s, 'STORY_DATE', `last_verified ${m.last_verified} is in the future`);
    if (isDate(m.published_date) && m.published_date > today) err(s, 'STORY_DATE', `published_date ${m.published_date} is in the future`);
    if (isDate(m.last_verified) && isDate(m.review_by)) {
      if (m.review_by <= m.last_verified) err(s, 'STORY_DATE', `review_by ${m.review_by} must be after last_verified ${m.last_verified}`);
      else if (m.review_by > addDays(m.last_verified, REVIEW_DAYS)) {
        (m.featured === true ? err : warn)(s, 'STORY_REVIEW_LONG', `review_by is more than ${REVIEW_DAYS} days after last_verified${m.featured === true ? ' (a featured story must be re-verified within 90 days)' : ''}`);
      }
    }
    if (!sources.length || !sources.some((x) => isAllowedLink(x?.url))) err(s, 'STORY_SOURCES', 'a ready story needs at least one Cisco or Meraki source link');
    if (!blank(m.title_tr) && m.title_tr.length > 60) {
      (m.title_tr.length > 75 ? err : warn)(s, 'STORY_TITLE_LENGTH', `title_tr is ${m.title_tr.length} characters (aim for 60 or fewer)`);
    }

    if (m.featured === true) {
      featured += 1;
      if (!Number.isInteger(m.order)) err(s, 'STORY_ORDER', 'a featured story needs an integer order');
      else if (featuredOrders.has(m.order)) err(s, 'STORY_ORDER', `order ${m.order} is also used by ${featuredOrders.get(m.order)}`);
      else featuredOrders.set(m.order, s.file);
      if (isDate(m.review_by) && m.review_by < today) {
        err(s, 'STORY_FEATURED_EXPIRED', `featured story is past its review_by date (${m.review_by}); re-verify it against its sources and move the dates, or set featured: false`);
      }
    } else if (isDate(m.review_by) && m.review_by < today) {
      warn(s, 'STORY_REVIEW_OVERDUE', `review_by ${m.review_by} has passed; re-verify this story`);
    }
  }

  if (featured > MAX_FEATURED) errors.push({ code: 'STORY_FEATURED_COUNT', message: `${featured} stories are featured; the hub shows at most ${MAX_FEATURED}` });
  if (featured < MIN_FEATURED && stories.some((s) => s.meta.status === 'ready')) {
    warnings.push({ code: 'STORY_FEATURED_FEW', message: `only ${featured} featured ready stories; the hub strip is meant to show ${MIN_FEATURED}-${MAX_FEATURED}` });
  }

  const count = (status) => stories.filter((s) => s.meta.status === status).length;
  return { errors, warnings, stats: { ready: count('ready'), draft: count('draft'), featured } };
}

/** The published stories as the site reads them: ready only, featured first by order, then newest first. */
export function storiesJson(stories) {
  const out = stories
    .filter((s) => s.meta.status === 'ready')
    .map((s) => {
      const m = s.meta;
      return {
        id: s.id,
        slug: { tr: m.slug_tr, en: m.slug_en },
        title: { tr: m.title_tr, en: m.title_en },
        teaser: { tr: m.teaser_tr, en: m.teaser_en },
        why: { tr: m.why_tr, en: m.why_en },
        body: { tr: s.body.tr, en: s.body.en },
        category: m.category,
        published_date: m.published_date,
        last_verified: m.last_verified,
        review_by: m.review_by,
        featured: m.featured === true,
        order: Number.isInteger(m.order) ? m.order : null,
        related_pids: m.related_pids ?? [],
        cta_family: m.cta_family || null,
        video_youtube_id: m.video_youtube_id || null,
        sources: m.sources,
      };
    });
  out.sort((a, b) => b.published_date.localeCompare(a.published_date) || a.id.localeCompare(b.id));
  return { stories: out };
}
