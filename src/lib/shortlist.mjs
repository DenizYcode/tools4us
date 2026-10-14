// The shortlist ("Seçimlerim"): models collected across families, kept in the browser (no account) and shared as a link
// or exported as a printout or a CSV file. Pure functions with the storage passed in, so the tests run without a
// browser. An item names a model card by family and slug, plus an optional configuration (the SKU string the
// configuration builder made). Nothing here knows a price: the list is not a quote.

export const FAMILIES = ['wireless', 'switching', 'routing'];
export const MAX_ITEMS = 40;
export const STORAGE_KEY = 'tools4us.shortlist.v1';

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
// A configuration is PIDs joined with " + ": letters, digits and . _ + - only (data rule: orderable PIDs).
const CONFIG = /^[A-Za-z0-9._-]+( \+ [A-Za-z0-9._-]+){0,5}$/;

export const isConfig = (value) => typeof value === 'string' && value.length <= 160 && CONFIG.test(value);

/** One item from untrusted input (storage, a shared link) or null. */
export function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { f, s, c } = raw;
  if (!FAMILIES.includes(f) || typeof s !== 'string' || !SLUG.test(s)) return null;
  const item = { f, s };
  if (c !== undefined && c !== null && c !== '') {
    if (!isConfig(c)) return null;
    item.c = c;
  }
  return item;
}

export const itemKey = (item) => `${item.f}/${item.s}${item.c ? `|${item.c}` : ''}`;

/** A list from untrusted input: invalid items dropped, duplicates dropped, capped at MAX_ITEMS. */
export function cleanList(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of raw) {
    const item = cleanItem(entry);
    if (!item || seen.has(itemKey(item))) continue;
    seen.add(itemKey(item));
    out.push(item);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export const hasItem = (list, item) => list.some((x) => itemKey(x) === itemKey(item));

/** The list with the item added (at the end) or removed. `ok: false` when the list is full. */
export function toggleItem(list, item) {
  const clean = cleanItem(item);
  if (!clean) return { list, on: false, ok: false };
  if (hasItem(list, clean)) return { list: list.filter((x) => itemKey(x) !== itemKey(clean)), on: false, ok: true };
  if (list.length >= MAX_ITEMS) return { list, on: false, ok: false };
  return { list: [...list, clean], on: true, ok: true };
}

export const removeItem = (list, item) => list.filter((x) => itemKey(x) !== itemKey(item));

/** Adds every item that is not in the list yet (a shared list saved on this device). */
export function mergeLists(list, extra) {
  return cleanList([...list, ...extra]);
}

// ---- storage -------------------------------------------------------------------------------------------------------

/** The saved list. Storage can be missing or blocked (private window); then the list is empty, never an error. */
export function loadList(storage) {
  try {
    return cleanList(JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

/** Saves the list. Returns false when the browser refused (blocked or full), so the page can say so. */
export function saveList(storage, list) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(cleanList(list)));
    return true;
  } catch {
    return false;
  }
}

// ---- share link ----------------------------------------------------------------------------------------------------
// ?l=wireless:cw9172i,switching:c9300-48p:C9300-48P%20%2B%20C9300-NM-8X  (family:slug[:encoded configuration])

export function encodeList(list) {
  return cleanList(list)
    .map((item) => [item.f, item.s, item.c ? encodeURIComponent(item.c) : null].filter(Boolean).join(':'))
    .join(',');
}

export function decodeList(text) {
  if (typeof text !== 'string' || !text) return [];
  const raw = text.split(',').map((token) => {
    const [f, s, c] = token.split(':');
    let config;
    try {
      config = c ? decodeURIComponent(c) : undefined;
    } catch {
      return null;
    }
    return { f, s, c: config };
  });
  return cleanList(raw);
}

// ---- CSV -----------------------------------------------------------------------------------------------------------

const CSV_SEPARATOR = ';';

/** A cell that cannot be read as a formula: Excel runs text that starts with = + - @ or a tab, so those get a quote prefix. */
function cell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV text for Turkish Excel: `;` between cells (Turkish list separator), CRLF line ends, a byte order mark so the
 * Turkish letters survive. `header` and each row are arrays of cells.
 */
export function toCsv(header, rows) {
  return `﻿${[header, ...rows].map((r) => r.map(cell).join(CSV_SEPARATOR)).join('\r\n')}\r\n`;
}
