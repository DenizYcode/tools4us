// The shortlist: storage that may be blocked, the share link, tampered input, the CSV for Turkish Excel, and the
// data for every published card (skipped when src/data/generated is absent).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  MAX_ITEMS, STORAGE_KEY, cleanItem, cleanList, itemKey, toggleItem, removeItem, mergeLists, loadList, saveList, encodeList, decodeList, toCsv, isConfig,
} from './shortlist.mjs';
import { buildShortlistData } from './shortlist-data.mjs';
import { groupCards } from './wireless-model.mjs';
import { groupSwitchCards } from './switching-model.mjs';
import { groupRouterCards } from './routing-model.mjs';
import { cardByPid } from './cards.mjs';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), map };
};

test('an item needs a known family and a plain slug; a configuration must be PIDs joined with +', () => {
  assert.deepEqual(cleanItem({ f: 'wireless', s: 'cisco-wireless-9172i' }), { f: 'wireless', s: 'cisco-wireless-9172i' });
  assert.deepEqual(cleanItem({ f: 'switching', s: 'c9300-48p', c: 'C9300-48P + C9300-NM-8X' }), { f: 'switching', s: 'c9300-48p', c: 'C9300-48P + C9300-NM-8X' });
  for (const bad of [null, 'x', {}, { f: 'security', s: 'a' }, { f: 'wireless', s: '../x' }, { f: 'wireless', s: 'A' }, { f: 'wireless', s: 'a', c: '<script>' }, { f: 'wireless', s: 'a', c: 'x'.repeat(200) }]) {
    assert.equal(cleanItem(bad), null, JSON.stringify(bad));
  }
  assert.equal(isConfig('C9300-48P + C9300-NM-8X'), true);
  assert.equal(isConfig('C9300-48P; DROP'), false);
});

test('toggling adds, then removes; the same model with another configuration is another item', () => {
  const a = { f: 'switching', s: 'c9300-48p' };
  let r = toggleItem([], a);
  assert.deepEqual(r, { list: [a], on: true, ok: true });
  const withCfg = { ...a, c: 'C9300-48P + C9300-NM-8X' };
  r = toggleItem(r.list, withCfg);
  assert.equal(r.list.length, 2);
  r = toggleItem(r.list, a);
  assert.deepEqual(r.list, [withCfg]);
  assert.equal(r.on, false);
  assert.deepEqual(removeItem(r.list, withCfg), []);
});

test('the list is capped, and a full list refuses a new item instead of dropping one', () => {
  let list = [];
  for (let i = 0; i < MAX_ITEMS; i += 1) list = toggleItem(list, { f: 'wireless', s: `m-${i}` }).list;
  assert.equal(list.length, MAX_ITEMS);
  const r = toggleItem(list, { f: 'wireless', s: 'one-more' });
  assert.equal(r.ok, false);
  assert.equal(r.list.length, MAX_ITEMS);
  assert.equal(cleanList(Array.from({ length: 100 }, (_, i) => ({ f: 'wireless', s: `m-${i}` }))).length, MAX_ITEMS);
});

test('storage: saved lists come back, junk and blocked storage give an empty list', () => {
  const storage = memory();
  const list = [{ f: 'wireless', s: 'a' }, { f: 'routing', s: 'b' }];
  assert.equal(saveList(storage, list), true);
  assert.deepEqual(loadList(storage), list);
  storage.map.set(STORAGE_KEY, '{not json');
  assert.deepEqual(loadList(storage), []);
  storage.map.set(STORAGE_KEY, JSON.stringify([{ f: 'nope', s: 'x' }, { f: 'wireless', s: 'ok' }]));
  assert.deepEqual(loadList(storage), [{ f: 'wireless', s: 'ok' }]);
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadList(blocked), []);
  assert.equal(saveList(blocked, list), false);
});

test('the share link round-trips, including a configuration, and survives a URL', () => {
  const list = [{ f: 'wireless', s: 'cisco-wireless-9172i' }, { f: 'switching', s: 'c9300-48p', c: 'C9300-48P + C9300-NM-8X' }];
  const text = encodeList(list);
  assert.ok(!text.includes(' ') && !text.includes('+'));
  const url = new URL(`https://example.com/tr/seclimlerim/?l=${encodeURIComponent(text)}`);
  assert.deepEqual(decodeList(url.searchParams.get('l')), list);
  assert.deepEqual(decodeList(text), list);
});

test('a tampered share link yields only valid items', () => {
  assert.deepEqual(decodeList(''), []);
  assert.deepEqual(decodeList(null), []);
  assert.deepEqual(decodeList('wireless:a,security:b,switching:C%20D,routing:ok:%E0%A4%A'), [{ f: 'wireless', s: 'a' }]);
  assert.deepEqual(decodeList('wireless:a:<img>'), []);
  assert.equal(decodeList(Array.from({ length: 200 }, (_, i) => `wireless:m-${i}`).join(',')).length, MAX_ITEMS);
});

test('merging a shared list keeps what is saved and adds what is new, once', () => {
  const saved = [{ f: 'wireless', s: 'a' }];
  const merged = mergeLists(saved, [{ f: 'wireless', s: 'a' }, { f: 'routing', s: 'b' }]);
  assert.deepEqual(merged.map(itemKey), ['wireless/a', 'routing/b']);
});

test('CSV: semicolons, quotes, a byte order mark, and no cell that Excel would run as a formula', () => {
  const csv = toCsv(['Model', 'Not'], [['Kablosuz AP; "yeni"', '=HYPERLINK("x")'], ['ışık', '-1'], ['C9300-48P + C9300-NM-8X', '+90']]);
  assert.ok(csv.startsWith('﻿Model;Not\r\n'));
  assert.ok(csv.includes('"Kablosuz AP; ""yeni""";\'=HYPERLINK(""x"")"') || csv.includes(`"Kablosuz AP; ""yeni""";"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes('ışık;\'-1'));
  assert.ok(csv.includes('C9300-48P + C9300-NM-8X;\'+90'));
  assert.ok(csv.endsWith('\r\n'));
});

const load = (name) => {
  const path = new URL(`../data/generated/${name}.json`, import.meta.url);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};
const wl = load('wireless');
const sw = load('switching');
const rt = load('routing');
const opts = { skip: !wl || !sw || !rt };

test('shortlist data: every published card is listed, configurations are verified pairs only, replacements exist', opts, () => {
  const families = {};
  for (const [family, data, group] of [['wireless', wl, groupCards], ['switching', sw, groupSwitchCards], ['routing', rt, groupRouterCards]]) {
    const cards = group(data.models);
    families[family] = { cards, lookup: cardByPid(cards), accessories: data.accessories, compat: data.compat };
  }
  const result = buildShortlistData({ lang: 'tr', families, href: (f, s) => `/tr/${f}/${s}/` });
  const total = Object.values(families).reduce((n, f) => n + f.cards.length, 0);
  assert.equal(Object.keys(result).length, total);
  let configured = 0;
  for (const [key, entry] of Object.entries(result)) {
    assert.ok(entry.n && entry.p.length && entry.h && entry.d, key);
    for (const sku of entry.cfg) {
      configured += 1;
      assert.equal(isConfig(sku), true, sku);
      const [model, accessory] = sku.split(' + ');
      const family = key.split('/')[0];
      assert.ok(families[family].compat.some((c) => c.model_pid === model && c.accessory_pid === accessory), `${sku} is not a verified pair`);
      assert.equal(entry.lc, 'current', `${key} offers a configuration but is not current`);
    }
    if (entry.lc !== 'current') {
      assert.ok(entry.lo, `${key}: no last order date`);
      assert.ok(entry.r.length > 0 || entry.rn || entry.rx, `${key}: End-of-Sale with no replacement link, note or "none"`);
    }
  }
  assert.ok(configured >= 100, `only ${configured} configurations`);
});
