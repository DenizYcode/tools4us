// Minimal RFC 4180 CSV reader (quoted fields, doubled quotes, newlines inside quotes).
// Returns rows as objects keyed by the header. `__line` is the spreadsheet row number: the header is row 1
// and every record counts once, even when a cell spans several physical lines. This is the "CSV row"
// numbering used by docs/Phase1_Dataset_Audit.xlsx.

import { readFileSync } from 'node:fs';

export function parseCsv(text) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    records.push({ line: recordLine, cells: record });
    record = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') pushField();
    else if (ch === '\r') continue;
    else if (ch === '\n') {
      pushRecord();
      line++;
      recordLine = line;
    } else field += ch;
  }
  if (field !== '' || record.length) pushRecord();
  return records;
}

export function readLegacyCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const [header, ...rest] = parseCsv(text);
  const keys = header.cells.map((k) => k.trim());
  return rest.map(({ cells }, index) => {
    const row = { __line: index + 2 };
    keys.forEach((k, i) => {
      row[k] = (cells[i] ?? '').trim();
    });
    return row;
  });
}
