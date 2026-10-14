import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildSheet, PARTICIPANTS, TASKS } from './sheet.mjs';
import { markdown, switchKey, pairKey, NEED_W } from './key.mjs';

const g = 'src/data/generated';
const have = existsSync(`${g}/switching.json`);
const opts = { skip: have ? false : 'run npm run build:data first' };
const read = (n) => JSON.parse(readFileSync(`${g}/${n}.json`, 'utf8'));

test('the scoring sheet has five participants, four tasks and a summary that applies the 4 of 5 bar', async () => {
  const wb = await buildSheet();
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Read me', 'Sessions', 'Summary', 'Findings']);
  const s = wb.getWorksheet('Sessions');
  assert.equal(s.rowCount, PARTICIPANTS + 1);
  assert.equal(s.getRow(2).getCell(1).value, 'P1');
  assert.equal(s.getRow(6).getCell(1).value, 'P5');
  assert.equal(s.columnCount, 4 + TASKS.length * 3 + 1);
  const sum = wb.getWorksheet('Summary');
  const f = (a) => sum.getCell(a).value.formula;
  assert.equal(f('C2'), 'COUNTA(Sessions!E2:E6)');
  assert.equal(f('D2'), 'COUNTIF(Sessions!E2:E6,"Y")');
  assert.equal(f('D5'), 'COUNTIF(Sessions!N2:N6,"Y")');
  assert.match(f('F2'), /IF\(C2<5,"PENDING",IF\(D2>=E2,"PASS","FAIL"\)\)/);
  assert.equal(sum.getCell('E2').value, 4);
  assert.match(f('F7'), /COUNTIF\(F2:F5,"FAIL"\)/);
});

test('the template carries no participant data', async () => {
  const wb = await buildSheet();
  const s = wb.getWorksheet('Sessions');
  for (let r = 2; r <= 6; r++) for (let c = 2; c <= s.columnCount; c++) assert.equal(s.getRow(r).getCell(c).value, null);
});

test('task 1 key: current 24-port PoE models only, split by the 420 W need, no overlap', opts, () => {
  const { enough, short } = switchKey(read('switching').models);
  assert.equal(NEED_W, 420);
  assert.ok(enough.length >= 5 && short.length >= 5);
  for (const m of [...enough, ...short]) {
    assert.equal(m.lifecycle, 'current');
    assert.equal(m.port_count, 24);
    assert.ok(m.poe);
  }
  assert.ok(enough.every((m) => m.poe_budget_w >= NEED_W));
  assert.ok(short.every((m) => m.poe_budget_w < NEED_W));
  assert.equal(new Set([...enough, ...short].map((m) => m.name_tr)).size, enough.length + short.length);
});

test('task 2 key: the two access points are published, current and differ in at least one row', opts, () => {
  const { cards, rows } = pairKey(read('wireless').models);
  assert.equal(cards.length, 2);
  assert.ok(cards.every((c) => c.lifecycle === 'current'));
  assert.ok(rows.length >= 1);
  // The site merges variants into one card: the key must too (a cloud variant adds "cloud" to the management list).
  const all = read('wireless').models;
  for (const c of cards) {
    const union = new Set(all.filter((m) => m.name_tr === c.name).flatMap((m) => m.management ?? []));
    assert.deepEqual([...c.management].sort(), [...union].sort(), c.name);
  }
  // The licence row is shown by the site and is a true difference, so the key keeps it.
  assert.ok(rows.some((r) => r.key === 'licence'));
});

test('the whole key renders with all four tasks and the stories', opts, () => {
  const md = markdown({ wireless: read('wireless').models, switching: read('switching').models, stories: read('stories').stories, today: '2026-10-14' });
  for (const h of ['## Task 1', '## Task 2', '## Task 3', '## Task 4', 'Moderator only']) assert.ok(md.includes(h), h);
  for (const s of read('stories').stories) assert.ok(md.includes(s.title.tr), s.title.tr);
});
