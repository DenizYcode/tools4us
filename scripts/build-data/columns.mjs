// Column specs drive everything about a sheet: the Excel header, dropdowns, cell parsing and the
// required-field check. A column is { key, type, vocab?, ready? }.
//   type: string | url | date | number | bool | enum | list (of strings) | numlist | enumlist
//   vocab: name in vocab.mjs (enum, enumlist)
//   ready: true when the column must be non-empty on a ready row

import { VOCAB } from './vocab.mjs';

const s = (key, ready = false) => ({ key, type: 'string', ready });
const url = (key, ready = false) => ({ key, type: 'url', ready });
const date = (key, ready = false) => ({ key, type: 'date', ready });
const num = (key, ready = false) => ({ key, type: 'number', ready });
const bool = (key, ready = false) => ({ key, type: 'bool', ready });
const en = (key, vocab, ready = false) => ({ key, type: 'enum', vocab, ready });
const enlist = (key, vocab, ready = false) => ({ key, type: 'enumlist', vocab, ready });
const list = (key, ready = false) => ({ key, type: 'list', ready });
const numlist = (key, ready = false) => ({ key, type: 'numlist', ready });

// Lifecycle block shared by models and accessories.
const LIFECYCLE = [
  en('lifecycle', 'lifecycle', true),
  date('eos_announced'),
  date('last_order'),
  date('ldos'),
  list('replacement_pid'),
  s('replacement_note'),
  bool('replacement_none'),
  url('eol_bulletin_url'),
];

const PROVENANCE = [url('datasheet_url', true), url('source_url', true), date('last_verified', true), date('added_date', true)];

// Legacy wording kept for traceability. Never parsed by the site.
const LEGACY = [s('legacy_source'), s('legacy_description'), s('legacy_notes'), s('legacy_features'), s('needs_data')];

export const COMMON_MODEL_COLUMNS = [
  s('pid', true),
  en('family', 'family', true),
  s('series', true),
  en('status', 'status', true),
  en('scope', 'scope', true),
  s('name_tr', true),
  s('name_en'),
  s('summary_tr', true),
  s('summary_en'),
  s('good_for_tr', true),
  s('good_for_en'),
  ...LIFECYCLE,
  enlist('management', 'management', true),
  s('licence_note_tr'),
  s('licence_note_en'),
  ...PROVENANCE,
  bool('recommended'),
  s('recommended_why_tr'),
  s('recommended_why_en'),
];

// Family-specific normalized spec columns. Filled in by the migration work per family.
export const FAMILY_MODEL_COLUMNS = {
  switching: [],
  wireless: [],
  routing: [],
  datacenter: [],
};

export const ACCESSORY_COLUMNS = [
  s('pid', true),
  en('family', 'family', true),
  en('kind', 'accessory_kind', true),
  en('status', 'status', true),
  en('scope', 'scope', true),
  s('name_tr', true),
  s('name_en'),
  ...LIFECYCLE,
  ...PROVENANCE,
];

export const COMPAT_COLUMNS = [
  { key: 'accessory_pid', type: 'string', ready: true },
  { key: 'model_pid', type: 'string', ready: true },
];

export const SERIES_COLUMNS = [
  en('family', 'family', true),
  s('series', true),
  en('status', 'status', true),
  en('scope', 'scope', true),
  s('series_intro_tr', true),
  s('series_intro_en'),
];

export const SHEETS = ['models', 'accessories', 'compat', 'series'];

export function sheetColumns(sheet, family) {
  switch (sheet) {
    case 'models':
      return [...COMMON_MODEL_COLUMNS, ...(FAMILY_MODEL_COLUMNS[family] ?? []), ...LEGACY];
    case 'accessories':
      return [...ACCESSORY_COLUMNS, ...(FAMILY_ACCESSORY_COLUMNS[family] ?? []), ...LEGACY];
    case 'compat':
      return COMPAT_COLUMNS;
    case 'series':
      return SERIES_COLUMNS;
    default:
      throw new Error(`Unknown sheet "${sheet}"`);
  }
}

export const FAMILY_ACCESSORY_COLUMNS = {
  switching: [],
  wireless: [],
  routing: [],
  datacenter: [],
};

export function vocabFor(column) {
  return column.vocab ? VOCAB[column.vocab] : null;
}
