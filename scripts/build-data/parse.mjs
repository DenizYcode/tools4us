// Cell <-> value conversion. Everything is stored in Excel as plain text or numbers so that
// Turkish-locale Excel cannot reinterpret it (dates are ISO text, lists are comma-separated).

import { VOCAB } from './vocab.mjs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isEmpty(raw) {
  return raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
}

function isRealDate(text) {
  if (!ISO_DATE.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

function splitList(text) {
  return String(text)
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const TRUE_WORDS = new Set(['yes', 'true', '1', 'evet']);
const FALSE_WORDS = new Set(['no', 'false', '0', 'hayır', 'hayir']);

// Returns { value, issue }. `issue` is a short message when the cell is not valid for its column.
export function parseCell(column, raw) {
  if (isEmpty(raw)) return { value: null };

  switch (column.type) {
    case 'string':
      return { value: String(raw).trim() };

    case 'url': {
      const text = String(raw).trim();
      return /^https:\/\/\S+$/.test(text)
        ? { value: text }
        : { value: text, issue: 'must be a full https:// URL' };
    }

    case 'date': {
      const text = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).trim();
      return isRealDate(text) ? { value: text } : { value: text, issue: 'must be a date written YYYY-MM-DD' };
    }

    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      return Number.isFinite(n) ? { value: n } : { value: String(raw), issue: 'must be a number' };
    }

    case 'bool': {
      if (typeof raw === 'boolean') return { value: raw };
      const word = String(raw).trim().toLowerCase();
      if (TRUE_WORDS.has(word)) return { value: true };
      if (FALSE_WORDS.has(word)) return { value: false };
      return { value: String(raw), issue: 'must be yes or no' };
    }

    case 'enum': {
      const text = String(raw).trim();
      return VOCAB[column.vocab].includes(text)
        ? { value: text }
        : { value: text, issue: `"${text}" is not in the ${column.vocab} list (${VOCAB[column.vocab].join(', ')})` };
    }

    case 'list':
      return { value: splitList(raw) };

    case 'numlist': {
      const parts = splitList(raw);
      const nums = parts.map(Number);
      return nums.every(Number.isFinite)
        ? { value: nums }
        : { value: parts, issue: 'must be numbers separated by commas' };
    }

    case 'enumlist': {
      const parts = splitList(raw);
      const bad = parts.filter((p) => !VOCAB[column.vocab].includes(p));
      return bad.length
        ? { value: parts, issue: `"${bad.join(', ')}" not in the ${column.vocab} list (${VOCAB[column.vocab].join(', ')})` }
        : { value: parts };
    }

    default:
      throw new Error(`Unknown column type "${column.type}"`);
  }
}

// Value -> what goes into the Excel cell.
export function serializeValue(column, value) {
  if (value === null || value === undefined) return null;
  if (column.type === 'bool') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  return value;
}

// Excel cell objects (rich text, hyperlinks, formulas) -> a primitive.
export function cellToPrimitive(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if ('result' in value) return value.result ?? null;
    if ('text' in value) return value.text;
    if ('hyperlink' in value) return value.hyperlink;
    return String(value);
  }
  return value;
}
