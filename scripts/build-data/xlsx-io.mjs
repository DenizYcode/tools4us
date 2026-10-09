// Read and write the catalog workbooks. The column specs in columns.mjs are the single description
// of a sheet, so the file you edit in Excel and the rows the validator sees cannot drift apart.

import ExcelJS from 'exceljs';
import { SHEETS, sheetColumns } from './columns.mjs';
import { VOCAB } from './vocab.mjs';
import { parseCell, serializeValue, cellToPrimitive, isEmpty } from './parse.mjs';

const WIDTHS = { pid: 24, series: 18, url: 36, date: 13, string: 28, list: 22, numlist: 18, enumlist: 22, enum: 16, number: 12, bool: 10 };
const LONG_TEXT = /_(tr|en)$|^legacy_|^needs_data$|_note$/;
const VALIDATION_ROWS = 2000;

function columnLetter(index) {
  let n = index + 1;
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// rowsBySheet: { models: [...], accessories: [...], compat: [...], series: [...] } of typed row objects.
export async function writeWorkbook(path, family, rowsBySheet) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'tools4us';
  wb.created = new Date(0);
  wb.modified = new Date(0);

  // Hidden sheet with the vocabularies, used by the dropdowns.
  const vocabNames = Object.keys(VOCAB);
  const vocabSheet = wb.addWorksheet('_vocab', { state: 'hidden' });
  vocabNames.forEach((name, i) => {
    vocabSheet.getCell(1, i + 1).value = name;
    VOCAB[name].forEach((value, j) => {
      vocabSheet.getCell(j + 2, i + 1).value = value;
    });
  });
  const vocabRange = (name) => {
    const i = vocabNames.indexOf(name);
    return `_vocab!$${columnLetter(i)}$2:$${columnLetter(i)}$${VOCAB[name].length + 1}`;
  };

  for (const sheet of SHEETS) {
    const columns = sheetColumns(sheet, family);
    const ws = wb.addWorksheet(sheet, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
    ws.columns = columns.map((c) => ({
      header: c.key,
      key: c.key,
      width: c.key === 'pid' || c.key === 'accessory_pid' || c.key === 'model_pid' ? WIDTHS.pid : LONG_TEXT.test(c.key) ? 40 : WIDTHS[c.type] ?? 20,
    }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF7' } };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    columns.forEach((c, i) => {
      const letter = columnLetter(i);
      // Text format keeps Excel from turning "2026-12-31" or long PIDs into dates or numbers.
      if (c.type === 'date' || c.type === 'string' || c.type === 'url' || c.type === 'list') ws.getColumn(i + 1).numFmt = '@';
      if (c.type === 'enum' || c.type === 'bool') {
        const formulae = c.type === 'bool' ? ['"yes,no"'] : [vocabRange(c.vocab)];
        ws.dataValidations.add(`${letter}2:${letter}${VALIDATION_ROWS}`, {
          type: 'list',
          allowBlank: true,
          formulae,
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Value not allowed',
          error: c.type === 'bool' ? 'Use yes or no.' : `Pick a value from the ${c.vocab} list.`,
        });
      }
    });

    for (const row of rowsBySheet[sheet] ?? []) {
      ws.addRow(columns.map((c) => serializeValue(c, row[c.key] ?? null)));
    }
  }

  await wb.xlsx.writeFile(path);
}

// Returns { sheets: { models, accessories, compat, series }, problems: [{ code, message, level }] }.
export async function readWorkbook(path, family) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const sheets = {};
  const problems = [];

  for (const sheet of SHEETS) {
    const columns = sheetColumns(sheet, family);
    const ws = wb.getWorksheet(sheet);
    sheets[sheet] = [];
    if (!ws) {
      problems.push({ level: 'error', code: 'SHEET_MISSING', message: `${family}.xlsx has no "${sheet}" sheet` });
      continue;
    }

    const headerIndex = new Map();
    ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = String(cellToPrimitive(cell.value) ?? '').trim();
      if (key) headerIndex.set(key, colNumber);
    });
    for (const c of columns) {
      if (!headerIndex.has(c.key)) problems.push({ level: 'error', code: 'SHEET_MISSING_COLUMN', message: `${family}.xlsx ${sheet}: column "${c.key}" is missing from the header row` });
    }
    const known = new Set(columns.map((c) => c.key));
    for (const key of headerIndex.keys()) {
      if (!known.has(key)) problems.push({ level: 'warning', code: 'SHEET_UNKNOWN_COLUMN', message: `${family}.xlsx ${sheet}: column "${key}" is not part of the schema and is ignored` });
    }

    ws.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
      if (rowNumber === 1) return;
      const row = { __row: rowNumber, __issues: [] };
      let any = false;
      for (const c of columns) {
        const colNumber = headerIndex.get(c.key);
        const raw = colNumber ? cellToPrimitive(excelRow.getCell(colNumber).value) : null;
        if (!isEmpty(raw)) any = true;
        const { value, issue } = parseCell(c, raw);
        row[c.key] = value;
        if (issue) row.__issues.push({ column: c.key, message: issue });
      }
      if (any) sheets[sheet].push(row);
    });
  }
  return { sheets, problems };
}
