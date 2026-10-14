// The review kit must never damage the sources: every test runs on a temporary copy of the real files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, FAMILIES, workbookPath } from '../build-data/catalog.mjs';
import { readWorkbook } from '../build-data/xlsx-io.mjs';
import { readGlossary } from '../build-data/glossary.mjs';
import { applyChanges, checkSuggestion, collect, replaceFrontmatterLine, replaceJsonLine, replaceStoryParagraph } from './lib.mjs';

function copyOfSources() {
  const dir = mkdtempSync(join(tmpdir(), 'review-'));
  cpSync(join(ROOT, 'src', 'i18n'), join(dir, 'src', 'i18n'), { recursive: true });
  cpSync(join(ROOT, 'data', 'catalog'), join(dir, 'data', 'catalog'), { recursive: true });
  cpSync(join(ROOT, 'data', 'glossary.xlsx'), join(dir, 'data', 'glossary.xlsx'));
  cpSync(join(ROOT, 'content'), join(dir, 'content'), { recursive: true });
  return dir;
}
const row = (item, suggested, status = '') => ({ id: item.id, target: item.target, turkish: item.turkish, suggested, status });
const text = (root, ...p) => readFileSync(join(root, ...p), 'utf8');

const root = copyOfSources();
test.after(() => rmSync(root, { recursive: true, force: true }));
const items = await collect(root);
const find = (pred) => items.find(pred);

test('every Turkish text is listed once with a target, and ids are unique', () => {
  assert.ok(items.length > 1000);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  for (const i of items) {
    assert.ok(i.turkish && i.turkish.trim(), `${i.where} has no Turkish text`);
    assert.ok(['i18n', 'catalog', 'glossary', 'story', 'story-body'].includes(i.target.kind));
  }
  const areas = new Set(items.map((i) => i.area));
  for (const a of ['UI', 'KVKK ve form (lawyer too)', 'Stories', 'Glossary', 'Series explainers', 'Model texts']) assert.ok(areas.has(a), a);
});

test('every Turkish column the site shows is exported, including the replacement notes of End-of-Sale models', () => {
  const columns = new Set(items.filter((i) => i.area === 'Model texts').map((i) => i.target.column));
  for (const c of ['summary_tr', 'good_for_tr', 'licence_note_tr', 'poe_note_tr', 'variant_note_tr', 'recommended_why_tr', 'replacement_note']) assert.ok(columns.has(c), c);
  const note = items.find((i) => i.target.column === 'replacement_note');
  assert.ok(note.english && note.english !== note.turkish, 'the English twin comes from replacement_note_en');
});

test('the sheet starts with the most visible text and model texts come last', () => {
  assert.equal(items[0].area, 'UI');
  assert.equal(items.at(-1).area, 'Model texts');
});

test('a model text used by many rows is one line with its count', () => {
  const shared = items.filter((i) => i.area === 'Model texts').sort((a, b) => b.usedBy - a.usedBy)[0];
  assert.ok(shared.usedBy > 10, `most shared text is used by ${shared.usedBy}`);
});

test('a dry run changes nothing', async () => {
  const before = text(root, 'src/i18n/tr.json');
  const item = find((i) => i.target.kind === 'i18n' && !/\{/.test(i.turkish));
  const result = await applyChanges([row(item, `${item.turkish} Deneme`)], { root, write: false });
  assert.deepEqual(result.applied, [item.id]);
  assert.equal(text(root, 'src/i18n/tr.json'), before);
});

test('a UI correction changes exactly one line and keeps line endings and order', async () => {
  const before = text(root, 'src/i18n/tr.json');
  const item = find((i) => i.target.kind === 'i18n' && i.target.key === 'nav.skip');
  const result = await applyChanges([row(item, 'Ana içeriğe atla')], { root, write: true });
  assert.deepEqual(result.applied, [item.id]);
  const after = text(root, 'src/i18n/tr.json');
  const a = before.split('\n');
  const b = after.split('\n');
  assert.equal(a.length, b.length);
  const changed = a.map((l, i) => i).filter((i) => a[i] !== b[i]);
  assert.equal(changed.length, 1);
  assert.match(b[changed[0]], /"nav.skip": "Ana içeriğe atla",?\r?$/);
  assert.equal(before.includes('\r\n'), after.includes('\r\n'));
  assert.equal(JSON.parse(after)['nav.skip'], 'Ana içeriğe atla');
});

test('a placeholder that goes missing, a stale export, a question and an empty suggestion are not applied', async () => {
  const withPlaceholder = find((i) => i.target.kind === 'i18n' && /\{name\}/.test(i.turkish));
  const plain = find((i) => i.target.kind === 'i18n' && i.target.key === 'nav.main');
  const result = await applyChanges(
    [
      row(withPlaceholder, withPlaceholder.turkish.replace('{name}', 'model')),
      { ...row(plain, 'Başka bir metin'), turkish: 'Dışa aktarıldıktan sonra değişmiş metin' },
      row(plain, 'Soru olan metin', 'soru'),
      row(plain, '   '),
    ],
    { root, write: true },
  );
  assert.equal(result.applied.length, 0);
  const reasons = result.skipped.map((s) => s.reason).join('\n');
  assert.match(reasons, /placeholders differ/);
  assert.match(reasons, /no longer reads as it did/);
  assert.match(reasons, /status "soru"/);
});

test('a catalog text changes in every row that holds it and nowhere else', async () => {
  const shared = items.filter((i) => i.area === 'Model texts' && i.target.family === 'switching').sort((a, b) => b.usedBy - a.usedBy)[0];
  const t = shared.target;
  const path = workbookPath('switching', join(root, 'data', 'catalog'));
  const before = (await readWorkbook(path, 'switching')).sheets;
  const holders = before.models.filter((r) => r[t.column] === shared.turkish).length;
  assert.ok(holders >= shared.usedBy);
  const result = await applyChanges([row(shared, `${shared.turkish} (gözden geçirildi)`)], { root, write: true });
  assert.deepEqual(result.applied, [shared.id]);
  const after = (await readWorkbook(path, 'switching')).sheets;
  assert.equal(after.models.length, before.models.length);
  assert.equal(after.models.filter((r) => r[t.column] === `${shared.turkish} (gözden geçirildi)`).length, holders);
  assert.equal(after.models.filter((r) => r[t.column] === shared.turkish).length, 0);
  // Every other cell is as it was.
  for (let i = 0; i < before.models.length; i++) {
    for (const key of Object.keys(before.models[i])) {
      if (key === t.column || key === '__issues') continue;
      assert.deepEqual(after.models[i][key], before.models[i][key], `row ${i} ${key}`);
    }
  }
  assert.equal(after.series.length, before.series.length);
  assert.equal(after.accessories.length, before.accessories.length);
});

test('a glossary meaning changes and the other terms stay', async () => {
  const item = find((i) => i.target.kind === 'glossary' && i.target.column === 'meaning_tr');
  const before = (await readGlossary(join(root, 'data', 'glossary.xlsx'))).terms;
  await applyChanges([row(item, `${item.turkish} Ek cümle.`)], { root, write: true });
  const after = (await readGlossary(join(root, 'data', 'glossary.xlsx'))).terms;
  assert.equal(after.length, before.length);
  const k = item.target.key;
  assert.equal(after.find((t) => t.key === k).meaning_tr, `${item.turkish} Ek cümle.`);
  for (const t of before.filter((x) => x.key !== k)) assert.deepEqual(after.find((x) => x.key === t.key), t);
});

test('a story title and a paragraph change; a link address may not change', async () => {
  const title = find((i) => i.target.kind === 'story' && i.target.field === 'title_tr');
  const para = find((i) => i.target.kind === 'story-body' && i.target.file === title.target.file && !/\]\(/.test(i.turkish) && i.turkish.length > 60);
  const before = text(root, title.target.file);
  const result = await applyChanges([row(title, `${title.turkish} (yeni)`), row(para, `${para.turkish} Son söz.`)], { root, write: true });
  assert.equal(result.applied.length, 2);
  assert.match(checkSuggestion('Bkz. [Cisco](https://www.cisco.com/a)', 'Bkz. [Cisco](https://example.com/)', 'story-body'), /links/);
  assert.equal(checkSuggestion('Bkz. [Cisco](https://www.cisco.com/a)', 'Ayrıntı için [Cisco](https://www.cisco.com/a).', 'story-body'), '');
  const after = text(root, title.target.file);
  assert.equal(before.includes('\r\n'), after.includes('\r\n'));
  assert.ok(after.includes(`${para.turkish.trim()} Son söz.`));
  assert.ok(after.includes('(yeni)'));
  // The English section is untouched.
  const en = (s) => s.slice(s.indexOf('<!-- en -->'));
  assert.equal(en(after), en(before));
});

test('helper functions refuse text that is not where the export said', () => {
  assert.throws(() => replaceJsonLine('{\n  "a": "x",\n  "b": "y"\n}', 'a', 'başka', 'z'), /no longer reads/);
  assert.throws(() => replaceJsonLine('{\n  "a": "x"\n}', 'zzz', 'x', 'z'), /not found/);
  assert.throws(() => replaceStoryParagraph('---\na: 1\n---\n<!-- tr -->\nmerhaba\n<!-- en -->\nhello', 'olmayan', 'x'), /no longer found/);
  assert.throws(() => replaceFrontmatterLine('---\ntitle_tr: "a"\n---\n<!-- tr -->\nx\n<!-- en -->\ny\n', 'title_tr', 'b', 'c'), /no longer reads/);
  assert.match(checkSuggestion('Merhaba {name}', 'Merhaba', 'i18n'), /placeholders/);
  assert.equal(checkSuggestion('Merhaba {name}', '{name}, merhaba', 'i18n'), '');
  assert.match(checkSuggestion('a', 'b\nc', 'i18n'), /one line/);
});

test('all family workbooks are still readable after the changes above', async () => {
  for (const family of FAMILIES) {
    const { problems } = await readWorkbook(workbookPath(family, join(root, 'data', 'catalog')), family);
    assert.deepEqual(problems.filter((p) => p.level === 'error'), []);
  }
});
