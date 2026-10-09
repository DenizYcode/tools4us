// Build checks (SPEC "Build checks", .claude/rules/data.md).
//   - Structure rules apply to every row that is in scope (drafts included).
//   - Content rules apply only to rows with status "ready".
//   - Rows with scope "excluded" are skipped entirely.
//
// Input: { families: { [family]: { models, accessories, compat, series } } }
// Rows are objects keyed by column name (null = empty). A row may carry __row (sheet row number)
// and __issues ([{ column, message }]) added by the workbook reader.
// Output: { errors, warnings, stats }. Each finding is { code, message }.

import { sheetColumns } from './columns.mjs';

const today = () => new Date().toISOString().slice(0, 10);

function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

function where(family, sheet, row) {
  const id = row.pid ?? row.accessory_pid ?? row.series ?? '';
  return `${family}.xlsx ${sheet} row ${row.__row ?? '?'}${id ? ` (${id})` : ''}`;
}

const inScope = (row) => row.scope !== 'excluded';
const isReady = (row) => row.status === 'ready' && inScope(row);

export function validateCatalog(catalog, { now = today() } = {}) {
  const errors = [];
  const warnings = [];
  const error = (code, message) => errors.push({ code, message });
  const warn = (code, message) => warnings.push({ code, message });

  const stats = {};
  const items = []; // every in-scope model and accessory, with its location
  const byPid = new Map();

  // Pass 1: per-row structure and collect PIDs.
  for (const [family, sheets] of Object.entries(catalog.families)) {
    const s = (stats[family] = {
      models: { total: 0, ready: 0, draft: 0, excluded: 0 },
      accessories: { total: 0, ready: 0, draft: 0, excluded: 0 },
      lifecycle: {},
      draftGaps: {},
    });

    for (const sheet of ['models', 'accessories']) {
      for (const row of sheets[sheet] ?? []) {
        const bucket = s[sheet];
        bucket.total += 1;
        if (!inScope(row)) {
          bucket.excluded += 1;
          continue;
        }
        if (row.status === 'ready') bucket.ready += 1;
        else bucket.draft += 1;
        const life = row.lifecycle ?? 'unverified';
        s.lifecycle[life] = (s.lifecycle[life] ?? 0) + 1;

        const loc = where(family, sheet, row);
        for (const issue of row.__issues ?? []) error('BAD_VALUE', `${loc}: ${issue.column} ${issue.message}`);
        if (!hasValue(row.status)) error('MISSING_STATUS', `${loc}: status is empty (draft or ready)`);
        if (!hasValue(row.scope)) error('MISSING_SCOPE', `${loc}: scope is empty (in or excluded)`);
        if (hasValue(row.family) && row.family !== family) {
          error('FAMILY_MISMATCH', `${loc}: family "${row.family}" does not match the ${family} workbook`);
        }
        if (!hasValue(row.pid)) {
          if (!isReady(row)) error('MISSING_PID', `${loc}: pid is empty`);
          continue;
        }
        const entry = { family, sheet, row, loc };
        items.push(entry);
        if (byPid.has(row.pid)) {
          error('DUP_PID', `${loc}: PID ${row.pid} is already used at ${byPid.get(row.pid).loc}`);
        } else {
          byPid.set(row.pid, entry);
        }
      }
    }
  }

  // Pass 2: series and compat structure.
  for (const [family, sheets] of Object.entries(catalog.families)) {
    const seriesKeys = new Set();
    for (const row of sheets.series ?? []) {
      if (!inScope(row)) continue;
      for (const issue of row.__issues ?? []) error('BAD_VALUE', `${where(family, 'series', row)}: ${issue.column} ${issue.message}`);
      if (seriesKeys.has(row.series)) error('DUP_SERIES', `${where(family, 'series', row)}: series ${row.series} is listed twice`);
      seriesKeys.add(row.series);
    }
    for (const row of sheets.models ?? []) {
      if (!inScope(row) || !hasValue(row.series)) continue;
      if (!seriesKeys.has(row.series)) {
        error('MISSING_SERIES', `${where(family, 'models', row)}: series "${row.series}" has no row in the series sheet`);
      }
    }

    const seenPairs = new Set();
    for (const row of sheets.compat ?? []) {
      const loc = where(family, 'compat', row);
      for (const issue of row.__issues ?? []) error('BAD_VALUE', `${loc}: ${issue.column} ${issue.message}`);
      const acc = byPid.get(row.accessory_pid);
      const mod = byPid.get(row.model_pid);
      if (!acc || acc.sheet !== 'accessories') {
        error('COMPAT_MISSING_PID', `${loc}: accessory ${row.accessory_pid} is not an in-scope accessory`);
      }
      if (!mod || mod.sheet !== 'models') {
        error('COMPAT_MISSING_PID', `${loc}: model ${row.model_pid} is not an in-scope model`);
      }
      const pair = `${row.accessory_pid}|${row.model_pid}`;
      if (seenPairs.has(pair)) error('DUP_COMPAT', `${loc}: ${row.accessory_pid} + ${row.model_pid} is listed twice`);
      seenPairs.add(pair);
    }
  }

  // Pass 3: lifecycle sanity and recommended rules, all in-scope rows.
  const recommendedBySeries = new Map();
  for (const { family, sheet, row, loc } of items) {
    if (row.lifecycle === 'eos_announced' && hasValue(row.last_order) && row.last_order < now) {
      warn('EOS_PAST_LAST_ORDER', `${loc}: last order date ${row.last_order} has passed, change lifecycle to eos`);
    }
    if (row.lifecycle === 'eos' && hasValue(row.last_order) && row.last_order > now) {
      warn('EOS_BEFORE_LAST_ORDER', `${loc}: lifecycle is eos but last order date ${row.last_order} is in the future`);
    }
    if (sheet !== 'models' || row.recommended !== true) continue;
    if (row.lifecycle !== 'current') {
      error('RECOMMENDED_NOT_CURRENT', `${loc}: a model that is not current cannot be recommended`);
    }
    if (!hasValue(row.recommended_why_tr)) error('RECOMMENDED_NO_REASON', `${loc}: recommended needs recommended_why_tr`);
    const key = `${family}/${row.series}`;
    const list = recommendedBySeries.get(key) ?? [];
    list.push(row.pid);
    recommendedBySeries.set(key, list);
  }
  for (const [key, pids] of recommendedBySeries) {
    if (pids.length > 1) error('RECOMMENDED_MULTIPLE', `series ${key} has ${pids.length} recommended models (${pids.join(', ')}); at most one`);
  }

  // Pass 4: ready rows must be complete.
  for (const [family, sheets] of Object.entries(catalog.families)) {
    for (const sheet of ['models', 'accessories', 'series']) {
      const columns = sheetColumns(sheet, family);
      for (const row of sheets[sheet] ?? []) {
        if (!inScope(row)) continue;
        const missing = columns.filter((c) => c.ready && !hasValue(row[c.key])).map((c) => c.key);
        if (row.status !== 'ready') {
          for (const key of missing) stats[family].draftGaps[`${sheet}.${key}`] = (stats[family].draftGaps[`${sheet}.${key}`] ?? 0) + 1;
          continue;
        }
        const loc = where(family, sheet, row);
        for (const key of missing) error('READY_MISSING_FIELD', `${loc}: ${key} is empty on a ready row`);
        if (sheet === 'series') continue;
        checkReadyLifecycle({ family, sheet, row, loc, byPid, error });
      }
    }
  }

  return { errors, warnings, stats };
}

function checkReadyLifecycle({ row, loc, byPid, error }) {
  if (!hasValue(row.lifecycle) || row.lifecycle === 'current') return;

  if (!hasValue(row.last_order)) error('LIFECYCLE_NEEDS_LAST_ORDER', `${loc}: ${row.lifecycle} needs last_order`);
  if (!hasValue(row.eol_bulletin_url)) error('LIFECYCLE_NEEDS_BULLETIN', `${loc}: ${row.lifecycle} needs eol_bulletin_url`);

  const pids = row.replacement_pid ?? [];
  const hasReplacement = pids.length > 0 || hasValue(row.replacement_note) || row.replacement_none === true;
  if (!hasReplacement) {
    error('REPLACEMENT_MISSING', `${loc}: ${row.lifecycle} needs a replacement_pid, a replacement_note or replacement_none`);
  }
  for (const pid of pids) {
    const target = byPid.get(pid);
    if (!target) {
      error('REPLACEMENT_NOT_FOUND', `${loc}: replacement ${pid} does not exist in the catalog`);
    } else if (!isReady(target.row) || target.row.lifecycle !== 'current') {
      error('REPLACEMENT_NOT_PUBLISHABLE', `${loc}: replacement ${pid} must be a ready, current model`);
    }
  }
}
