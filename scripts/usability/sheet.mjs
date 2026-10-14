// Blank scoring sheet for the usability test: one row per participant, four tasks, and a summary that applies the SPEC
// bar ("at least 4 of 5 participants pass every task"). Fill a copy outside the repo; the template stays blank.
//   node scripts/usability/sheet.mjs [--out=docs/Phase7_Usability_Scoring.xlsx]
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';

export const PARTICIPANTS = 5;
export const TASKS = [
  ['Task 1', '24-port switch for 10 access points and 8 cameras'],
  ['Task 2', 'Compare two access points, name one difference'],
  ['Task 3', 'Find a new Cisco feature and explain it'],
  ['Task 4', 'Add models to the list and share it (link or PDF)'],
];

const col = (n) => String.fromCharCode(64 + n);

export async function buildSheet() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'tools4us';
  wb.created = new Date(0);
  wb.modified = new Date(0);

  const readme = wb.addWorksheet('Read me');
  readme.getColumn(1).width = 110;
  for (const line of [
    'Usability test scoring (SPEC "Done when")',
    '',
    'One row per participant on "Sessions". Pass = Y, fail = N, using the answer key (docs/Phase7_Usability_Key.md). A task that runs past its time limit (3 minutes for task 1, 5 for the others) is N.',
    'Seconds: time from reading the task aloud to the participant saying they are done (or the limit). Ease: the participant\'s own rating, 1 (very hard) to 5 (very easy), asked right after the task.',
    '"Summary" counts the passes by itself. The launch bar: at least 4 of 5 participants pass every task. Until five are entered it says PENDING.',
    'Write what you saw, not what you think: where they hesitated, what they tapped, words they did not understand. Copy each real problem to "Findings" with a severity.',
    'Keep the participants anonymous: P1 to P5, age band and phone type only. No names in this file.',
  ]) readme.addRow([line]).alignment = { wrapText: true, vertical: 'top' };
  readme.getRow(1).font = { bold: true, size: 14 };

  const s = wb.addWorksheet('Sessions', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  const headers = ['Participant', 'Date', 'Phone (model, Android or iOS)', 'Age band'];
  for (const [t] of TASKS) headers.push(`${t} pass (Y/N)`, `${t} seconds`, `${t} ease (1-5)`);
  headers.push('What I observed');
  s.columns = headers.map((header, i) => ({ header, width: i === 0 ? 12 : i === 2 ? 26 : header === 'What I observed' ? 70 : 14 }));
  s.getRow(1).font = { bold: true };
  s.getRow(1).alignment = { wrapText: true, vertical: 'top' };
  s.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF7' } };
  for (let p = 1; p <= PARTICIPANTS; p++) {
    const row = s.addRow([`P${p}`]);
    row.alignment = { vertical: 'top', wrapText: true };
    TASKS.forEach((_, t) => {
      const base = 5 + t * 3; // first task column is E
      row.getCell(base).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Y,N"'] };
      row.getCell(base + 2).dataValidation = { type: 'whole', operator: 'between', formulae: [1, 5], allowBlank: true };
    });
  }

  const sum = wb.addWorksheet('Summary');
  sum.columns = [
    { header: 'Task', width: 10 },
    { header: 'What', width: 52 },
    { header: 'Tested', width: 9 },
    { header: 'Passed', width: 9 },
    { header: 'Needed', width: 9 },
    { header: 'Verdict', width: 12 },
    { header: 'Median seconds', width: 16 },
    { header: 'Mean ease', width: 11 },
  ];
  sum.getRow(1).font = { bold: true };
  const last = PARTICIPANTS + 1;
  TASKS.forEach(([name, what], t) => {
    const pass = col(5 + t * 3);
    const sec = col(6 + t * 3);
    const ease = col(7 + t * 3);
    const r = t + 2;
    sum.addRow([name, what]);
    sum.getCell(`C${r}`).value = { formula: `COUNTA(Sessions!${pass}2:${pass}${last})` };
    sum.getCell(`D${r}`).value = { formula: `COUNTIF(Sessions!${pass}2:${pass}${last},"Y")` };
    sum.getCell(`E${r}`).value = 4;
    sum.getCell(`F${r}`).value = { formula: `IF(C${r}<${PARTICIPANTS},"PENDING",IF(D${r}>=E${r},"PASS","FAIL"))` };
    sum.getCell(`G${r}`).value = { formula: `IFERROR(MEDIAN(Sessions!${sec}2:${sec}${last}),"")` };
    sum.getCell(`H${r}`).value = { formula: `IFERROR(ROUND(AVERAGE(Sessions!${ease}2:${ease}${last}),1),"")` };
  });
  const o = TASKS.length + 3;
  sum.getCell(`A${o}`).value = 'Overall';
  sum.getCell(`A${o}`).font = { bold: true };
  sum.getCell(`F${o}`).value = { formula: `IF(COUNTIF(F2:F5,"PENDING")>0,"PENDING",IF(COUNTIF(F2:F5,"FAIL")>0,"FAIL","PASS"))` };
  sum.getCell(`F${o}`).font = { bold: true };
  sum.getCell(`B${o}`).value = 'Launch needs PASS here (every task passed by at least 4 of 5)';

  const f = wb.addWorksheet('Findings', { views: [{ state: 'frozen', ySplit: 1 }] });
  f.columns = [
    { header: '#', width: 5 },
    { header: 'Severity (blocker / major / minor)', width: 16 },
    { header: 'Task', width: 8 },
    { header: 'Page', width: 28 },
    { header: 'What happened', width: 60 },
    { header: 'Who (P1, P3...)', width: 14 },
    { header: 'Idea to fix', width: 50 },
    { header: 'Status', width: 12 },
  ];
  f.getRow(1).font = { bold: true };
  f.getRow(1).alignment = { wrapText: true, vertical: 'top' };
  for (let r = 2; r <= 40; r++) f.getCell(`B${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"blocker,major,minor"'] };
  return wb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = (process.argv.find((a) => a.startsWith('--out=')) ?? '--out=docs/Phase7_Usability_Scoring.xlsx').slice(6);
  const wb = await buildSheet();
  await wb.xlsx.writeFile(out);
  console.log(`wrote ${out}`);
}
