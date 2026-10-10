// The glossary feeds every tooltip and "Bu ne demek?" box (SPEC "Info boxes"). One xlsx, sheet "terms".
// Every term needs Turkish and English text, so a tooltip is never empty in either language.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { ROOT } from './catalog.mjs';

export const GLOSSARY_PATH = join(ROOT, 'data', 'glossary.xlsx');
export const GLOSSARY_COLUMNS = ['key', 'term_tr', 'term_en', 'meaning_tr', 'meaning_en'];
const KEY_SHAPE = /^[a-z][a-z0-9_]*$/;

const text = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('').trim();
  return String(v).trim();
};

export async function writeGlossary(path, terms) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'tools4us';
  wb.created = new Date(0);
  wb.modified = new Date(0);
  const ws = wb.addWorksheet('terms', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  ws.columns = GLOSSARY_COLUMNS.map((key) => ({ header: key, key, width: key.startsWith('meaning') ? 70 : key === 'key' ? 18 : 26 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF7' } };
  for (const term of terms) ws.addRow(GLOSSARY_COLUMNS.map((c) => term[c] ?? ''));
  await wb.xlsx.writeFile(path);
}

// Returns { terms, problems }. A missing file is an error: tooltips would silently go blank.
export async function readGlossary(path = GLOSSARY_PATH) {
  const problems = [];
  if (!existsSync(path)) return { terms: [], problems: [{ level: 'error', code: 'GLOSSARY_MISSING', message: 'data/glossary.xlsx does not exist' }] };
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.getWorksheet('terms');
  if (!ws) return { terms: [], problems: [{ level: 'error', code: 'GLOSSARY_SHEET', message: 'data/glossary.xlsx has no "terms" sheet' }] };
  const index = new Map();
  ws.getRow(1).eachCell((cell, col) => index.set(text(cell.value), col));
  for (const c of GLOSSARY_COLUMNS) {
    if (!index.has(c)) problems.push({ level: 'error', code: 'GLOSSARY_COLUMN', message: `data/glossary.xlsx: column "${c}" is missing` });
  }
  if (problems.length) return { terms: [], problems };
  const terms = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const term = { __row: n };
    for (const c of GLOSSARY_COLUMNS) term[c] = text(row.getCell(index.get(c)).value);
    if (GLOSSARY_COLUMNS.some((c) => term[c] !== '')) terms.push(term);
  });
  return { terms, problems };
}

export function validateGlossary(terms) {
  const errors = [];
  const seen = new Set();
  for (const t of terms) {
    const loc = `glossary.xlsx row ${t.__row} (${t.key || '?'})`;
    if (!KEY_SHAPE.test(t.key)) errors.push({ code: 'GLOSSARY_KEY', message: `${loc}: key must be lowercase letters, digits and _` });
    if (seen.has(t.key)) errors.push({ code: 'GLOSSARY_DUP', message: `${loc}: key is listed twice` });
    seen.add(t.key);
    for (const c of GLOSSARY_COLUMNS.slice(1)) {
      if (!t[c]) errors.push({ code: 'GLOSSARY_EMPTY', message: `${loc}: ${c} is empty` });
    }
  }
  return errors;
}

// Published shape: { [key]: { tr: { term, meaning }, en: { term, meaning } } }.
export function glossaryJson(terms) {
  return Object.fromEntries(
    terms.map((t) => [t.key, { tr: { term: t.term_tr, meaning: t.meaning_tr }, en: { term: t.term_en, meaning: t.meaning_en } }]),
  );
}
