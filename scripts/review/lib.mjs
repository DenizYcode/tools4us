// Turkish review kit, shared logic. `collect` lists every Turkish text a visitor can read, with its English twin and
// the exact place it lives in; `applyChanges` writes a reviewer's corrections back to those places.
//
// Where the text lives (and how a correction is written back):
//   i18n      src/i18n/tr.json            one line per key, replaced in place (line endings and order untouched)
//   catalog   data/catalog/<family>.xlsx  every row whose cell holds exactly the old text (published and draft rows
//                                         share templates, so they change together), the workbook is re-saved
//   glossary  data/glossary.xlsx          term_tr and meaning_tr
//   story     content/stories/*.md        frontmatter line (title, teaser, why) or one paragraph of the Turkish body
//
// A target is a small JSON object stored in the export, so a corrected file always finds its way home.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FAMILIES, ROOT, workbookPath } from '../build-data/catalog.mjs';
import { readWorkbook, writeWorkbook } from '../build-data/xlsx-io.mjs';
import { readGlossary, writeGlossary } from '../build-data/glossary.mjs';
import { parseStoryFile } from '../build-data/stories.mjs';

const MODEL_TEXT_COLUMNS = ['name', 'summary', 'good_for', 'licence_note', 'poe_note', 'variant_note', 'recommended_why'];
const STORY_FIELDS = ['title', 'teaser', 'why'];
const norm = (s) => String(s ?? '').replace(/\r\n?/g, '\n').trim();
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const linksOf = (s) => [...String(s).matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).sort().join(',');

/** Rows of the review sheet, most visible text first. `root` is the repository root (tests pass a copy). */
export async function collect(root = ROOT) {
  const items = [];
  const add = (item) => items.push({ usedBy: 1, examples: '', ...item });

  // 1. UI strings.
  const tr = JSON.parse(readFileSync(join(root, 'src/i18n/tr.json'), 'utf8'));
  const en = JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8'));
  for (const [key, text] of Object.entries(tr)) {
    const section = key.split('.')[0];
    const area = section === 'privacy' || section === 'contact' ? 'KVKK ve form (lawyer too)' : section === 'footer' ? 'Footer disclaimer (lawyer too)' : 'UI';
    add({ area, section, where: `src/i18n/tr.json: ${key}`, english: en[key] ?? '', turkish: text, target: { kind: 'i18n', key } });
  }

  // 2. Stories.
  const dir = join(root, 'content', 'stories');
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
      const { meta, body } = parseStoryFile(readFileSync(join(dir, name), 'utf8'));
      if (meta.status !== 'ready') continue;
      const file = `content/stories/${name}`;
      for (const f of STORY_FIELDS) add({ area: 'Stories', section: name.replace(/\.md$/, ''), where: `${file}: ${f}_tr`, english: meta[`${f}_en`] ?? '', turkish: meta[`${f}_tr`] ?? '', target: { kind: 'story', file, field: `${f}_tr` } });
      const trParas = body.tr.split(/\n{2,}/);
      const enParas = body.en.split(/\n{2,}/);
      trParas.forEach((p, i) => add({ area: 'Stories', section: name.replace(/\.md$/, ''), where: `${file}: Turkish text, paragraph ${i + 1}`, english: trParas.length === enParas.length ? enParas[i] : '(paragraphs differ between TR and EN: read the English section of the file)', turkish: p, target: { kind: 'story-body', file } }));
    }
  }

  // 3. Glossary.
  const { terms } = await readGlossary(join(root, 'data', 'glossary.xlsx'));
  for (const t of terms) {
    for (const f of ['term', 'meaning']) add({ area: 'Glossary', section: t.key, where: `data/glossary.xlsx: ${t.key}.${f}_tr`, english: t[`${f}_en`], turkish: t[`${f}_tr`], target: { kind: 'glossary', key: t.key, column: `${f}_tr` } });
  }

  // 4. Series explainers and model texts, one row per distinct text.
  for (const family of FAMILIES) {
    const path = workbookPath(family, join(root, 'data', 'catalog'));
    if (!existsSync(path)) continue;
    const { sheets } = await readWorkbook(path, family);
    const published = (r) => r.status === 'ready' && r.scope !== 'excluded';
    for (const r of sheets.series.filter(published)) {
      add({ area: 'Series explainers', section: family, where: `data/catalog/${family}.xlsx series: ${r.series}`, english: r.series_intro_en ?? '', turkish: r.series_intro_tr, target: { kind: 'catalog', family, sheet: 'series', column: 'series_intro_tr' } });
    }
    for (const base of MODEL_TEXT_COLUMNS) {
      const column = `${base}_tr`;
      if (!sheets.models.length || !(column in sheets.models[0])) continue;
      const groups = new Map();
      for (const r of sheets.models.filter(published)) {
        const text = r[column];
        if (!text) continue;
        // A product name that is the same in both languages is a name, not a translation.
        if (base === 'name' && text === r.name_en) continue;
        const g = groups.get(text) ?? { rows: [], english: r[`${base}_en`] ?? '' };
        g.rows.push(r.pid);
        groups.set(text, g);
      }
      for (const [text, g] of groups) {
        add({ area: 'Model texts', section: `${family} ${column}`, where: `data/catalog/${family}.xlsx models: ${column}`, english: g.english, turkish: text, usedBy: g.rows.length, examples: g.rows.slice(0, 3).join(', '), target: { kind: 'catalog', family, sheet: 'models', column } });
      }
    }
  }

  // Most visible text first, so a reviewer with little time starts where it matters (the sort is stable).
  const order = ['UI', 'Footer disclaimer (lawyer too)', 'KVKK ve form (lawyer too)', 'Stories', 'Glossary', 'Series explainers', 'Model texts'];
  items.sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area));
  items.forEach((item, i) => (item.id = `T-${String(i + 1).padStart(4, '0')}`));
  return items;
}

// ---------------------------------------------------------------------------------------------------------------
// Applying corrections

/** Replaces the value of one `"key": "value"` line in a JSON file without touching anything else. */
export function replaceJsonLine(source, key, oldValue, newValue) {
  const lines = source.split('\n');
  const prefix = `  ${JSON.stringify(key)}: `;
  const at = lines.findIndex((l) => l.startsWith(prefix));
  if (at < 0) throw new Error(`key "${key}" not found`);
  const cr = lines[at].endsWith('\r') ? '\r' : '';
  const comma = lines[at].replace(/\r$/, '').endsWith(',') ? ',' : '';
  const current = JSON.parse(lines[at].slice(prefix.length).replace(/\r$/, '').replace(/,$/, ''));
  if (norm(current) !== norm(oldValue)) throw new Error(`"${key}" no longer reads as it did in the export`);
  lines[at] = `${prefix}${JSON.stringify(newValue)}${comma}${cr}`;
  return lines.join('\n');
}

/** Same for one top-level scalar line of a story's YAML frontmatter. */
export function replaceFrontmatterLine(source, field, oldValue, newValue) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  const at = lines.findIndex((l, i) => i > 0 && i < end && l.startsWith(`${field}: `));
  if (at < 0) throw new Error(`frontmatter field "${field}" not found`);
  if (norm(parseStoryFile(source).meta[field]) !== norm(oldValue)) throw new Error(`"${field}" no longer reads as it did in the export`);
  lines[at] = `${field}: ${JSON.stringify(newValue)}`;
  const out = lines.join(eol);
  if (parseStoryFile(out).meta[field] !== newValue) throw new Error(`"${field}" does not read back as written`);
  return out;
}

/** Replaces one paragraph of the Turkish section of a story. */
export function replaceStoryParagraph(source, oldText, newText) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const text = source.replace(/\r\n?/g, '\n');
  const start = text.indexOf('<!-- tr -->');
  const end = text.indexOf('<!-- en -->');
  if (start < 0 || end < start) throw new Error('no <!-- tr --> section before <!-- en -->');
  const section = text.slice(start, end);
  const old = norm(oldText);
  const first = section.indexOf(old);
  if (first < 0) throw new Error('paragraph no longer found in the Turkish section');
  if (section.indexOf(old, first + 1) >= 0 && old.length < 40) throw new Error('paragraph text is not unique in the section');
  const next = text.slice(0, start) + section.slice(0, first) + norm(newText) + section.slice(first + old.length) + text.slice(end);
  return next.replace(/\n/g, eol);
}

/** Checks one correction against the text it replaces. Returns an error message or ''. */
export function checkSuggestion(current, suggested, kind) {
  if (!norm(suggested)) return 'the suggestion is empty';
  if (placeholders(current) !== placeholders(suggested)) return `placeholders differ: the text has {${placeholders(current)}} and the suggestion {${placeholders(suggested)}}`;
  if (kind === 'story-body' && linksOf(current) !== linksOf(suggested)) return 'the links (addresses in parentheses) differ from the original';
  if (kind === 'i18n' && /\n/.test(suggested)) return 'a UI string must stay on one line';
  return '';
}

const dirtyPaths = (root, paths) => {
  const r = spawnSync('git', ['status', '--porcelain', '--', ...paths], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean).map((l) => l.slice(3)) : [];
};

/**
 * @param {Array<{ id: string, target: any, turkish: string, suggested: string, status: string }>} rows
 * @returns {Promise<{ applied: string[], skipped: Array<{ id: string, reason: string }>, files: string[] }>}
 */
export async function applyChanges(rows, { root = ROOT, write = false, force = false } = {}) {
  const applied = [];
  const skipped = [];
  const touched = new Set();
  const pending = { i18n: new Map(), catalog: new Map(), glossary: new Map(), story: new Map() };
  const file = (...p) => join(root, ...p);

  const wanted = rows.filter((r) => {
    const status = String(r.status ?? '').trim().toLowerCase();
    if (!norm(r.suggested) || norm(r.suggested) === norm(r.turkish)) return false;
    if (/^(soru|question|atla|skip)/.test(status)) {
      skipped.push({ id: r.id, reason: `status "${status}": not applied` });
      return false;
    }
    return true;
  });

  // Load each source once, change it in memory, write once at the end.
  const sources = { i18n: readFileSync(file('src/i18n/tr.json'), 'utf8'), workbooks: new Map(), glossary: null, stories: new Map() };

  for (const r of wanted) {
    const t = r.target;
    const problem = checkSuggestion(r.turkish, r.suggested, t.kind);
    if (problem) {
      skipped.push({ id: r.id, reason: problem });
      continue;
    }
    try {
      if (t.kind === 'i18n') {
        sources.i18n = replaceJsonLine(sources.i18n, t.key, r.turkish, norm(r.suggested));
        touched.add('src/i18n/tr.json');
      } else if (t.kind === 'catalog') {
        const key = t.family;
        if (!sources.workbooks.has(key)) sources.workbooks.set(key, (await readWorkbook(workbookPath(key, file('data', 'catalog')), key)).sheets);
        const sheet = sources.workbooks.get(key)[t.sheet];
        const hits = sheet.filter((row) => norm(row[t.column]) === norm(r.turkish));
        if (!hits.length) throw new Error(`no row of ${t.family} ${t.sheet} holds this text any more`);
        for (const row of hits) row[t.column] = norm(r.suggested);
        touched.add(`data/catalog/${t.family}.xlsx`);
      } else if (t.kind === 'glossary') {
        if (!sources.glossary) sources.glossary = (await readGlossary(file('data', 'glossary.xlsx'))).terms;
        const term = sources.glossary.find((x) => x.key === t.key);
        if (!term || norm(term[t.column]) !== norm(r.turkish)) throw new Error('glossary entry no longer reads as it did in the export');
        term[t.column] = norm(r.suggested);
        touched.add('data/glossary.xlsx');
      } else if (t.kind === 'story' || t.kind === 'story-body') {
        const path = file(t.file);
        if (!sources.stories.has(t.file)) sources.stories.set(t.file, readFileSync(path, 'utf8'));
        const src = sources.stories.get(t.file);
        sources.stories.set(t.file, t.kind === 'story' ? replaceFrontmatterLine(src, t.field, r.turkish, norm(r.suggested)) : replaceStoryParagraph(src, r.turkish, r.suggested));
        touched.add(t.file);
      } else throw new Error(`unknown target kind "${t.kind}"`);
      applied.push(r.id);
    } catch (error) {
      skipped.push({ id: r.id, reason: error.message });
    }
  }

  if (write && touched.size) {
    const dirty = force ? [] : dirtyPaths(root, [...touched]);
    if (dirty.length) throw new Error(`these files have uncommitted changes, commit or stash them first (or use --force): ${dirty.join(', ')}`);
    if (touched.has('src/i18n/tr.json')) writeFileSync(file('src/i18n/tr.json'), sources.i18n);
    for (const [family, sheets] of sources.workbooks) if (touched.has(`data/catalog/${family}.xlsx`)) await writeWorkbook(workbookPath(family, file('data', 'catalog')), family, sheets);
    if (sources.glossary && touched.has('data/glossary.xlsx')) await writeGlossary(file('data', 'glossary.xlsx'), sources.glossary);
    for (const [name, text] of sources.stories) if (touched.has(name)) writeFileSync(file(name), text);
  }
  return { applied, skipped, files: [...touched].sort() };
}
