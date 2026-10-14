// Search on the real published catalog (skipped when src/data/generated is absent): Turkish folding both ways,
// typos, PIDs typed loosely, an old PID that leads to its replacement, and no draft PID anywhere in the index.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { normalize, compact, distance, search, prepareIndex } from './search.mjs';
import { buildIndex } from './search-index.mjs';
import { groupCards } from './wireless-model.mjs';
import { groupSwitchCards } from './switching-model.mjs';
import { groupRouterCards } from './routing-model.mjs';
import { cardByPid } from './cards.mjs';
import { loadCatalog } from '../../scripts/build-data/catalog.mjs';

const load = (name) => {
  const path = new URL(`../data/generated/${name}.json`, import.meta.url);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};
const wl = load('wireless');
const sw = load('switching');
const rt = load('routing');
const gl = load('glossary');
const st = load('stories');
const labels = {
  tr: JSON.parse(readFileSync(new URL('../i18n/tr.json', import.meta.url), 'utf8')),
  en: JSON.parse(readFileSync(new URL('../i18n/en.json', import.meta.url), 'utf8')),
};
const opts = { skip: !wl || !sw || !rt || !gl || !st };

function indexFor(lang) {
  const cards = { wireless: groupCards(wl.models), switching: groupSwitchCards(sw.models), routing: groupRouterCards(rt.models) };
  const lookup = Object.fromEntries(Object.entries(cards).map(([f, list]) => [f, cardByPid(list)]));
  const names = {
    tr: { wireless: 'Kablosuz', switching: 'Anahtarlama', routing: 'Yönlendirme' },
    en: { wireless: 'Wireless', switching: 'Switching', routing: 'Routing' },
  };
  const familyNames = names[lang];
  const pages = Object.entries(familyNames).map(([family, title]) => ({ id: family, title, text: `${title} ${family}`, href: `/${lang}/${family}/` }));
  const raw = buildIndex({
    lang,
    cards,
    lookup,
    stories: st.stories,
    glossary: gl,
    labels: labels[lang],
    familyNames,
    pages,
    href: {
      model: (family, slug) => `/${lang}/${family}/${slug}/`,
      story: (slug) => `/${lang}/stories/${slug}/`,
      term: (key) => `/${lang}/glossary/#${key}`,
    },
  });
  // Through JSON, as the browser receives it.
  return prepareIndex(JSON.parse(JSON.stringify(raw)));
}

const top = (index, q) => search(index, q)[0]?.entry;

test('Turkish letters fold both ways and case does not matter', () => {
  assert.equal(normalize('ışık'), 'isik');
  assert.equal(normalize('IŞIK'), 'isik');
  assert.equal(normalize('İstanbul'), 'istanbul');
  assert.equal(normalize('Kablosuz'), normalize('kablosuz'));
  assert.equal(normalize('Güvenlik'), normalize('GUVENLIK'));
  assert.equal(normalize('bağlantı'), normalize('baglanti'));
});

test('a PID is the same with or without separators', () => {
  assert.equal(compact('C9300-24P'), 'c930024p');
  assert.equal(compact('c9300 24p'), 'c930024p');
});

test('distance counts one typo, one swap, and gives up above the limit', () => {
  assert.equal(distance('kablosz', 'kablosuz', 2), 1);
  assert.equal(distance('kabloszu', 'kablosuz', 2), 1);
  assert.equal(distance('abc', 'xyzxyz', 1), 2);
});

test('empty and symbol-only queries find nothing', opts, () => {
  const index = indexFor('tr');
  assert.deepEqual(search(index, ''), []);
  assert.deepEqual(search(index, '  --  '), []);
});

test('"kablosuz", "Kablosuz" and "KABLOSUZ" give the same first result, the wireless family page', opts, () => {
  const index = indexFor('tr');
  for (const q of ['kablosuz', 'Kablosuz', 'KABLOSUZ']) assert.equal(top(index, q).id, 'page:wireless', q);
});

test('a word typed without Turkish letters finds the page that has them', opts, () => {
  const index = indexFor('tr');
  assert.equal(top(index, 'yonlendirme').id, 'page:routing');
  assert.equal(top(index, 'Yönlendirme').id, 'page:routing');
  const plain = search(index, 'guvenlik');
  assert.ok(plain.length > 0 && plain.some((h) => h.entry.kind === 'story'));
  assert.deepEqual(plain.map((h) => h.entry.id), search(index, 'güvenlik').map((h) => h.entry.id));
});

test('a typo of one letter still finds the word, a nonsense word finds nothing', opts, () => {
  const index = indexFor('tr');
  assert.equal(top(index, 'kablosz').id, 'page:wireless');
  assert.equal(top(index, 'yunlendirme').id, 'page:routing');
  assert.equal(top(index, 'anahtarlma').id, 'page:switching');
  assert.deepEqual(search(index, 'qzxwv'), []);
});

test('every published model is found by each of its PIDs, typed in lower case without separators', opts, () => {
  const index = indexFor('tr');
  const models = index.filter((e) => e.kind === 'model');
  assert.ok(models.length > 300);
  for (const model of models) {
    for (const pid of model.pids) {
      const hits = search(index, compact(pid), { limit: 5 });
      assert.ok(hits.some((h) => h.entry.id === model.id), `${pid} did not find ${model.id}`);
      assert.equal(hits[0].entry.pids.some((p) => compact(p) === compact(pid)), true, `${pid}: the first hit is not that PID`);
    }
  }
});

test('an old PID finds the old model, and that result carries the replacement links', opts, () => {
  const index = indexFor('tr');
  const old = top(index, 'ms210-24-hw');
  assert.ok(old.pids.includes('MS210-24-HW'));
  assert.equal(old.lc, 'eos');
  assert.ok(old.repl.length > 0 && old.repl.some((r) => /ms150/.test(r.href)), JSON.stringify(old.repl));
  // Every End-of-Sale model with a replacement PID in the catalog carries at least one link.
  const eos = index.filter((e) => e.kind === 'model' && e.lc !== 'current');
  assert.ok(eos.length > 50);
  const withPid = [...wl.models, ...sw.models, ...rt.models].filter((m) => m.lifecycle !== 'current' && (m.replacement_pid ?? []).length);
  for (const m of withPid) {
    const entry = eos.find((e) => e.pids.includes(m.pid));
    assert.ok(entry && entry.repl.length > 0, `${m.pid} has no replacement link in the index`);
  }
});

test('the English index finds English text and the same PIDs', opts, () => {
  const index = indexFor('en');
  assert.equal(top(index, 'wireless').id, 'page:wireless');
  // Published PIDs of the CW9172I are its variants (-RTG, -CFG), so the query matches as a PID prefix.
  assert.ok(top(index, 'cw9172i').pids.some((p) => compact(p).startsWith('cw9172i')));
});

test('stories and glossary terms are found', opts, () => {
  const index = indexFor('tr');
  assert.ok(search(index, 'live protect').some((h) => h.entry.id === 'story:live-protect'));
  assert.ok(search(index, 'erisim noktasi').some((h) => h.entry.kind === 'term'));
});

test('no draft or excluded PID is in the index and none is found by search', opts, async () => {
  const index = indexFor('tr');
  const { catalog } = await loadCatalog();
  const published = new Set(index.flatMap((e) => e.pids ?? []));
  const hidden = [];
  for (const sheets of Object.values(catalog.families)) {
    for (const row of [...sheets.models, ...sheets.accessories]) {
      if (row.pid && !(row.status === 'ready' && row.scope !== 'excluded')) hidden.push(row.pid);
    }
  }
  assert.ok(hidden.length > 100);
  for (const pid of hidden) {
    if (published.has(pid)) continue;
    assert.equal(index.some((e) => e.pids?.includes(pid)), false, pid);
    const hits = search(index, pid, { limit: 3 });
    assert.equal(hits.some((h) => h.entry.pids?.some((p) => compact(p) === compact(pid))), false, `${pid} found`);
  }
  assert.ok(JSON.stringify(index).length < 900_000, 'index too large');
});
