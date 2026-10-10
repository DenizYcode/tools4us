import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { groupCards, slugify, bySeries, replacementCards, cardByPid, textOf, isCurrent, hasSixGhz } from './wireless-model.mjs';
import { applyFilters, EMPTY_FILTERS, activeCount } from './filter.mjs';
import { recommend, ANSWER_OPTIONS } from './selector.mjs';
import { buildRows, parseSelection } from './compare.mjs';
import { trPossessive } from './tr.mjs';

function row(pid, over = {}) {
  return {
    pid, family: 'wireless', series: 'S1', name_tr: `Model ${pid}`, summary_tr: 'özet', good_for_tr: 'iyi', lifecycle: 'current',
    management: ['on_prem'], wifi_generation: '7', environment: 'indoor', bands_ghz: [2.4, 5, 6], spatial_streams: 6,
    uplink_max_gbps: 2.5, poe_supported: ['at'], poe_full: 'at', features: [], datasheet_url: 'https://www.cisco.com/x', source_url: 'https://www.cisco.com/x', last_verified: '2026-10-10',
    ...over,
  };
}

const cards = (rows) => groupCards(rows);

test('slugify folds Turkish letters and punctuation', () => {
  assert.equal(slugify('Cisco Wireless 9172I'), 'cisco-wireless-9172i');
  assert.equal(slugify('Catalyst IW9167E (Heavy Duty)'), 'catalyst-iw9167e-heavy-duty');
  assert.equal(slugify('Işık Şöyle Ğüç'), 'isik-soyle-guc');
});

test('variants with the same name become one card; the card lists every PID and the union of management', () => {
  const rows = [row('A-CFG', { name_tr: 'Model A' }), row('A-RTG', { name_tr: 'Model A', recommended: true, recommended_why_tr: 'neden' }), row('B', { name_tr: 'Model B' })];
  const result = cards(rows);
  assert.equal(result.length, 2);
  const a = result.find((c) => c.slug === 'model-a');
  assert.deepEqual(a.pids, ['A-CFG', 'A-RTG']);
  assert.equal(a.recommended, true);
  assert.equal(a.text.tr.recommended_why, 'neden');
  const mr = cards([row('X', { name_tr: 'X', management: ['on_prem'] }), row('X-MR', { name_tr: 'X', management: ['cloud'] })])[0];
  assert.deepEqual(mr.management, ['on_prem', 'cloud']);
  assert.equal(mr.unified, true);
});

test('variants that disagree on lifecycle, environment, generation or PoE are refused', () => {
  for (const [field, value] of [['lifecycle', 'eos'], ['environment', 'outdoor'], ['wifi_generation', '6'], ['poe_full', 'bt']]) {
    assert.throws(() => cards([row('A', { name_tr: 'M' }), row('B', { name_tr: 'M', [field]: value })]), new RegExp(field));
  }
});

test('English text falls back to Turkish when empty', () => {
  const c = cards([row('A', { summary_en: null })])[0];
  assert.equal(textOf(c, 'en', 'summary'), 'özet');
  const d = cards([row('B', { summary_en: 'english' })])[0];
  assert.equal(textOf(d, 'en', 'summary'), 'english');
});

test('series order: series with current models first, newer Wi-Fi first, End-of-Sale-only series last; recommended leads inside', () => {
  const rows = [
    row('OLD1', { series: 'OLD', lifecycle: 'eos_announced', wifi_generation: '6', replacement_pid: ['N1'] }),
    row('N1', { series: 'NEW', wifi_generation: '7' }),
    row('N2', { series: 'NEW', wifi_generation: '7', recommended: true, recommended_why_tr: 'x' }),
    row('M1', { series: 'MID', wifi_generation: '6e' }),
  ];
  const result = bySeries(cards(rows), [{ series: 'OLD' }, { series: 'NEW' }, { series: 'MID' }]);
  assert.deepEqual(result.map((s) => s.series), ['NEW', 'MID', 'OLD']);
  assert.equal(result[0].cards[0].pids[0], 'N2');
});

test('replacement cards resolve to published cards', () => {
  const all = cards([row('OLD1', { lifecycle: 'eos_announced', replacement_pid: ['N1-CFG', 'N1-RTG'] }), row('N1-CFG', { name_tr: 'N1' }), row('N1-RTG', { name_tr: 'N1' })]);
  const old = all.find((c) => c.pids[0] === 'OLD1');
  const found = replacementCards(old, cardByPid(all));
  assert.equal(found.length, 1, 'both variants of one model give one link');
  assert.equal(found[0].name, 'N1');
});

const base = [
  row('IN7', { name_tr: 'IN7', wifi_generation: '7', poe_full: 'bt', management: ['on_prem', 'cloud'], uplink_max_gbps: 10, features: ['cleanair', 'uwb'] }),
  row('IN6E', { name_tr: 'IN6E', wifi_generation: '6e', poe_full: 'at', management: ['on_prem'] }),
  row('OUT6', { name_tr: 'OUT6', wifi_generation: '6', environment: 'outdoor', bands_ghz: [2.4, 5], poe_full: 'af', poe_supported: ['af'], management: ['cloud'], uplink_max_gbps: 1 }),
  row('BOTH', { name_tr: 'BOTH', environment: 'indoor_outdoor', wifi_generation: '7', poe_full: 'bt', management: ['on_prem'] }),
  row('EOS', { name_tr: 'EOS', lifecycle: 'eos_announced', wifi_generation: '6', poe_full: 'af', poe_supported: ['af'], replacement_pid: ['IN6E'] }),
];
const all = cards(base);
const names = (list) => list.map((c) => c.name).sort();
const f = (over) => ({ ...EMPTY_FILTERS, ...over });

test('filters: End-of-Sale models are hidden unless asked for', () => {
  assert.ok(!names(applyFilters(all, f({}))).includes('EOS'));
  assert.ok(names(applyFilters(all, f({ showOld: true }))).includes('EOS'));
});

test('filters: OR inside a group, AND across groups', () => {
  assert.deepEqual(names(applyFilters(all, f({ gen: ['7', '6'] }))), ['BOTH', 'IN7', 'OUT6']);
  assert.deepEqual(names(applyFilters(all, f({ gen: ['7', '6'], env: ['outdoor'] }))), ['BOTH', 'OUT6']);
  assert.deepEqual(names(applyFilters(all, f({ mgmt: ['cloud'], gen: ['7'] }))), ['IN7']);
});

test('filters: an indoor+outdoor model matches both choices; the PoE filter is "my switch gives at most X"', () => {
  assert.ok(names(applyFilters(all, f({ env: ['indoor'] }))).includes('BOTH'));
  assert.ok(names(applyFilters(all, f({ env: ['outdoor'] }))).includes('BOTH'));
  assert.deepEqual(names(applyFilters(all, f({ poeMax: 'af' }))), ['OUT6']);
  assert.deepEqual(names(applyFilters(all, f({ poeMax: 'at' }))), ['IN6E', 'OUT6']);
  assert.equal(applyFilters(all, f({ poeMax: 'bt' })).length, 4);
});

test('filters: unified means a model that can be managed both ways; features are all required; 6 GHz and mGig', () => {
  assert.deepEqual(names(applyFilters(all, f({ mgmt: ['unified'] }))), ['IN7']);
  assert.deepEqual(names(applyFilters(all, f({ features: ['cleanair'] }))), ['IN7']);
  assert.deepEqual(names(applyFilters(all, f({ features: ['cleanair', 'gnss_gps'] }))), [], 'every selected feature must be present');
  assert.ok(!names(applyFilters(all, f({ sixGhz: true }))).includes('OUT6'));
  assert.ok(!names(applyFilters(all, f({ mgig: true }))).includes('OUT6'));
  assert.equal(activeCount(f({ gen: ['7', '6'], sixGhz: true, showOld: true })), 4);
});

test('selector: only current models, whatever the answers (exhaustive over every answer combination)', () => {
  const o = ANSWER_OPTIONS;
  let combos = 0;
  for (const env of o.env) for (const mgmt of o.mgmt) for (const poe of o.poe) for (const density of o.density) for (const future of o.future) {
    combos += 1;
    const { results } = recommend(all, { env, mgmt, poe, density, future });
    assert.ok(results.length <= 3);
    for (const r of results) {
      assert.ok(isCurrent(r.card), `${r.card.name} is not current`);
      assert.notEqual(r.card.lifecycle, 'eos_announced');
      assert.notEqual(r.card.lifecycle, 'eos');
    }
  }
  assert.equal(combos, 2 * 4 * 4 * 3 * 3);
});

test('selector: the recommended model comes first, and a model that needs more PoE is not offered while another fits', () => {
  const pool = cards([
    row('BIG', { name_tr: 'BIG', poe_full: 'bt', spatial_streams: 12 }),
    row('REC', { name_tr: 'REC', poe_full: 'at', recommended: true, recommended_why_tr: 'x' }),
    row('SMALL', { name_tr: 'SMALL', poe_full: 'at', spatial_streams: 4 }),
  ]);
  const a = { env: 'indoor', mgmt: 'any', poe: 'at', density: 'low', future: 'any' };
  const { results, relaxed } = recommend(pool, a);
  assert.equal(results[0].card.name, 'REC');
  assert.ok(!results.some((r) => r.card.name === 'BIG'));
  assert.deepEqual(relaxed, []);
  assert.ok(results.every((r) => !r.warnings.some((w) => w.startsWith('poe-short'))));
});

test('selector: when nothing is fully powered, the closest are shown with a PoE warning and the relaxation is reported', () => {
  const pool = cards([row('BIG', { name_tr: 'BIG', poe_full: 'bt' })]);
  const { results, relaxed } = recommend(pool, { env: 'indoor', mgmt: 'any', poe: 'af', density: 'low', future: 'any' });
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].warnings.filter((w) => w.startsWith('poe-short')), ['poe-short.bt']);
  assert.deepEqual(relaxed, ['poe']);
});

test('selector: an unknown switch gets the PoE the model needs as a warning; 6 GHz models carry the Turkey note; no match gives no results', () => {
  const { results } = recommend(all, { env: 'indoor', mgmt: 'any', poe: 'unknown', density: 'low', future: 'any' });
  assert.ok(results.every((r) => r.warnings.some((w) => w.startsWith('poe-needed'))));
  assert.ok(results.some((r) => r.warnings.includes('six-ghz-turkey')));
  const none = recommend(all, { env: 'outdoor', mgmt: 'cisco_business', poe: 'bt', density: 'low', future: 'any' });
  assert.deepEqual(none.results, []);
});

test('compare: rows flag differences, selections are limited to four known slugs', () => {
  const [a, b] = cards([row('A', { name_tr: 'A' }), row('B', { name_tr: 'B', poe_full: 'bt', poe_supported: ['at', 'bt'] })]);
  const rows = buildRows([a, b]);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.equal(byKey.poe_full.differs, true);
  assert.equal(byKey.wifi_generation.differs, false);
  assert.deepEqual(parseSelection('a,b,a,zzz,c,d,e,f', ['a', 'b', 'c', 'd', 'e', 'f']), ['a', 'b', 'c', 'd']);
  assert.deepEqual(parseSelection(null, ['a']), []);
});

test('the real published catalog groups cleanly (skipped when src/data/generated is absent)', { skip: !existsSync(new URL('../data/generated/wireless.json', import.meta.url)) }, () => {
  const json = JSON.parse(readFileSync(new URL('../data/generated/wireless.json', import.meta.url), 'utf8'));
  const result = groupCards(json.models);
  assert.ok(result.length > 0 && result.length < json.models.length, 'variants were merged');
  assert.equal(new Set(result.map((c) => c.slug)).size, result.length, 'slugs are unique');
  const lookup = cardByPid(result);
  for (const c of result) {
    if (c.lifecycle !== 'current') assert.ok(replacementCards(c, lookup).length > 0, `${c.name} has a published replacement`);
    assert.ok(replacementCards(c, lookup).every(isCurrent));
    if (hasSixGhz(c)) assert.ok(c.bands_ghz.includes(6));
  }
  const rec = bySeries(result, json.series).flatMap((s) => s.cards.filter((c) => c.recommended));
  assert.ok(rec.every(isCurrent), 'no End-of-Sale model is recommended');

  // SPEC "Done when": zero End-of-Sale models from any selector, checked on the real catalog for every answer.
  const o = ANSWER_OPTIONS;
  let nonEmpty = 0;
  for (const env of o.env) for (const mgmt of o.mgmt) for (const poe of o.poe) for (const density of o.density) for (const future of o.future) {
    const { results } = recommend(result, { env, mgmt, poe, density, future });
    if (results.length) nonEmpty += 1;
    assert.ok(results.every((r) => r.card.lifecycle === 'current'), `${env}/${mgmt}/${poe}/${density}/${future}`);
  }
  assert.ok(nonEmpty > 0);
});

test('Turkish possessive for the live count', () => {
  const cases = { 0: "0'ı", 1: "1'i", 2: "2'si", 3: "3'ü", 4: "4'ü", 5: "5'i", 6: "6'sı", 7: "7'si", 8: "8'i", 9: "9'u", 10: "10'u", 20: "20'si", 27: "27'si", 30: "30'u", 40: "40'ı", 50: "50'si", 60: "60'ı", 70: "70'i", 80: "80'i", 90: "90'ı", 100: "100'ü", 36: "36'sı", 54: "54'ü", 1000: "1000'i" };
  for (const [n, want] of Object.entries(cases)) assert.equal(trPossessive(Number(n)), want, String(n));
});
