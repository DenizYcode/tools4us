// One-time seed of data/catalog/ from data/legacy/. Refuses to overwrite hand-edited workbooks.
//   node scripts/build-data/migrate/cli.mjs [--force]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, CATALOG_DIR, FAMILIES, workbookPath } from '../catalog.mjs';
import { writeWorkbook } from '../xlsx-io.mjs';
import { sheetColumns } from '../columns.mjs';
import { createContext, decide } from './common.mjs';
import { migrateWireless } from './wireless.mjs';
import { migrateSwitching } from './switching.mjs';
import { migrateRouting } from './routing.mjs';
import { migrateDatacenter } from './datacenter.mjs';

const force = process.argv.includes('--force');
const LEGACY_DIR = join(ROOT, 'data', 'legacy');
const FEATURE_FILE = join(ROOT, 'scripts', 'build-data', 'vocab-features.json');
const SEED = JSON.parse(readFileSync(join(ROOT, 'scripts', 'build-data', 'migrate', 'lifecycle-seed.json'), 'utf8'));
const REPORT = join(ROOT, 'docs', 'Phase1_Needs_Decision.md');

const existing = FAMILIES.filter((f) => existsSync(workbookPath(f)));
if (existing.length && !force) {
  console.error(`Refusing to overwrite ${existing.map((f) => `${f}.xlsx`).join(', ')} in data/catalog/.`);
  console.error('Those workbooks are edited by hand after the first seed. Re-run with --force to regenerate from data/legacy/.');
  process.exit(1);
}

const ctx = createContext();
const data = {
  wireless: migrateWireless(ctx, LEGACY_DIR),
  switching: migrateSwitching(ctx, LEGACY_DIR),
  routing: migrateRouting(ctx, LEGACY_DIR),
  datacenter: migrateDatacenter(ctx, LEGACY_DIR),
};

// ---- Lifecycle from the audit seed -------------------------------------------------------------
const byPid = new Map();
for (const [family, d] of Object.entries(data)) {
  for (const row of [...d.models, ...d.accessories]) byPid.set(row.pid, row);
}
const COMMENTARY = /\b(in data|already in data|missing from data)\b/i;

function splitReplacement(text) {
  const notes = [];
  let core = text;
  const parens = [...text.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  core = text.replace(/\([^)]*\)/g, '').trim();
  for (const p of parens) if (!COMMENTARY.test(p)) notes.push(p);
  const pids = [];
  const rest = [];
  for (const token of core.split(/\s+\/\s+/).map((t) => t.trim()).filter(Boolean)) {
    if (byPid.has(token)) pids.push(token);
    else rest.push(token);
  }
  const noteParts = [...(rest.length ? [rest.join(' / ')] : []), ...notes];
  return { pids, note: noteParts.length ? noteParts.join(' | ') : null };
}

let seeded = 0;
for (const entry of SEED.entries) {
  for (const pid of entry.pids) {
    const row = byPid.get(pid);
    if (!row) {
      decide(ctx, 'all', 'Lifecycle seed PID not in the catalog', `${pid} (${entry.audit_ref}) was not found in the migrated data.`);
      continue;
    }
    row.lifecycle = entry.lifecycle;
    row.last_order = entry.last_order ?? null;
    row.ldos = entry.ldos ?? null;
    row.eol_bulletin_url = entry.eol_bulletin_url ?? null;
    if (entry.replacement_none) row.replacement_none = true;
    if (entry.replacement_text) {
      if (/missing from data/i.test(entry.replacement_text) && !ctx.decisions.some((d) => d.topic === 'Replacement model missing from the data')) {
        decide(ctx, 'switching', 'Replacement model missing from the data', `${entry.replacement_text}: the audit says these replacements are not in the legacy files (audit #4). They are named in replacement_note on the old models; add them as models, with specs from the datasheet, in Phase 4.`);
      }
      const { pids, note } = splitReplacement(entry.replacement_text);
      row.replacement_pid = pids.filter((p) => p !== pid);
      row.replacement_note = note;
    }
    row.__lifecycleRef = entry.audit_ref;
    seeded += 1;
  }
}

// Wireless rows the audit did not cover keep the legacy label, flagged.
let legacyCurrent = 0;
for (const m of data.wireless.models) {
  if (!m.lifecycle && m.__legacyLifecycle === 'Current') {
    m.lifecycle = 'current';
    legacyCurrent += 1;
  }
}
decide(ctx, 'wireless', 'Lifecycle taken from the legacy label', `${legacyCurrent} wireless models are lifecycle=current only because the old CSV said "Current"; the audit did not check them individually. Rows with a blank or "Shipping Sep 2026" label (CW9177*, IW9167/IW9165) stay unverified.`);

// ---- Feature vocabularies ----------------------------------------------------------------------
const vocab = {};
const leftOut = [];
for (const family of FAMILIES) {
  const map = ctx.features[family] ?? new Map();
  const keep = [...map.entries()].filter(([key, e]) => e.count >= 2 && key.length <= 32).map(([key]) => key).sort();
  vocab[family] = keep;
  for (const [key, e] of map) if (!keep.includes(key)) leftOut.push(`${family}: "${e.label}" (${e.count} row${e.count > 1 ? 's' : ''})`);
  for (const m of data[family].models) m.features = (m.features ?? []).filter((f) => keep.includes(f));
}
writeFileSync(FEATURE_FILE, `${JSON.stringify(vocab, null, 2)}\n`);
if (leftOut.length) decide(ctx, 'all', 'Feature wording left in legacy_features only', `Used by one row or too long to be a feature name, so not added to the vocabulary: ${leftOut.join('; ')}`);

// ---- Per-row checklist -------------------------------------------------------------------------
const UNIVERSAL = new Set(['summary_tr', 'good_for_tr', 'source_url', 'last_verified', 'added_date', 'status', 'scope', 'pid', 'family', 'series', 'name_tr', 'kind']);
for (const [family, d] of Object.entries(data)) {
  for (const [sheet, rows] of [['models', d.models], ['accessories', d.accessories]]) {
    const columns = sheetColumns(sheet, family).filter((c) => c.ready && !UNIVERSAL.has(c.key));
    for (const row of rows) {
      const missing = columns.filter((c) => {
        const v = row[c.key];
        return v === null || v === undefined || (Array.isArray(v) && !v.length);
      }).map((c) => c.key);
      if (row.lifecycle && row.lifecycle !== 'current') {
        if (!row.last_order) missing.push('last_order');
        if (!row.eol_bulletin_url) missing.push('eol_bulletin_url');
        if (!row.replacement_pid?.length && !row.replacement_note && !row.replacement_none) missing.push('replacement');
      }
      row.needs_data = missing.length ? missing.join(', ') : null;
    }
  }
}

// ---- Write -------------------------------------------------------------------------------------
mkdirSync(CATALOG_DIR, { recursive: true });
for (const family of FAMILIES) {
  await writeWorkbook(workbookPath(family), family, data[family]);
}

// ---- Report ------------------------------------------------------------------------------------
function section(family) {
  const items = ctx.decisions.filter((d) => d.family === family);
  const topics = [...new Set(items.map((d) => d.topic))];
  const out = [];
  for (const topic of topics) {
    const list = items.filter((d) => d.topic === topic);
    out.push(`### ${topic} (${list.length})`, '');
    for (const d of list.slice(0, 6)) out.push(`- ${d.detail}`);
    if (list.length > 6) out.push(`- ... and ${list.length - 6} more`);
    out.push('');
  }
  return out.join('\n');
}

const counts = Object.fromEntries(FAMILIES.map((f) => [f, { models: data[f].models.length, accessories: data[f].accessories.length, compat: data[f].compat.length, series: data[f].series.length }]));
const lines = [
  '# Phase 1: decisions and gaps from the legacy migration',
  '',
  'Generated by `scripts/build-data/migrate/cli.mjs`. Nothing below was guessed: each item is a place where the old CSV was ambiguous, where a value was derived, or where data is missing. Every migrated row starts as `draft`.',
  '',
  '## Row counts',
  '',
  '| Workbook | models | accessories | compat pairs | series |',
  '| --- | --- | --- | --- | --- |',
  ...FAMILIES.map((f) => `| ${f}.xlsx | ${counts[f].models} | ${counts[f].accessories} | ${counts[f].compat} | ${counts[f].series} |`),
  '',
  `Lifecycle values applied from the audit's Lifecycle tab: ${seeded} PIDs. Everything else is unverified (empty) unless noted below.`,
  '',
  ...['all', ...FAMILIES].flatMap((f) => (ctx.decisions.some((d) => d.family === f) ? [`## ${f === 'all' ? 'All families' : f}`, '', section(f)] : [])),
];
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(REPORT, `${lines.join('\n')}\n`);

console.log('Migration written to data/catalog/:');
for (const f of FAMILIES) console.log(`  ${f}.xlsx  models ${counts[f].models}, accessories ${counts[f].accessories}, compat ${counts[f].compat}, series ${counts[f].series}`);
console.log(`Lifecycle applied from audit seed: ${seeded} PIDs. Report: docs/Phase1_Needs_Decision.md`);
