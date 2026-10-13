// Switching and routing logic on the real published catalog (skipped when src/data/generated is absent):
// cards, filters, guided selectors (exhaustive over every answer combination), compare rows, value labels.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { groupSwitchCards, bySeries as switchSeries } from './switching-model.mjs';
import { groupRouterCards, bySeries as routerSeries } from './routing-model.mjs';
import { cardByPid, replacementCards } from './cards.mjs';
import { emptyState, matchesWith, activeCountWith, readState } from './filter-engine.mjs';
import { SWITCH_FILTERS, ROUTER_FILTERS, FILTERS, PANELS } from './filters.mjs';
import { SELECTORS } from './selectors.mjs';
import { SWITCH_OPTIONS } from './selector-switching.mjs';
import { ROUTER_OPTIONS } from './selector-routing.mjs';
import { buildRows, ROWS_BY_FAMILY } from './compare.mjs';
import { formatValue } from './format.mjs';

const load = (name) => {
  const path = new URL(`../data/generated/${name}.json`, import.meta.url);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};
const tr = JSON.parse(readFileSync(new URL('../i18n/tr.json', import.meta.url), 'utf8'));
const en = JSON.parse(readFileSync(new URL('../i18n/en.json', import.meta.url), 'utf8'));

const sw = load('switching');
const rt = load('routing');
const opts = { skip: !sw || !rt };

const product = (obj) => {
  const keys = Object.keys(obj);
  return keys.reduce((acc, k) => acc.flatMap((a) => obj[k].map((v) => ({ ...a, [k]: v }))), [{}]);
};

test('switching cards: one PID per card, unique slugs, every published model is grouped', opts, () => {
  const cards = groupSwitchCards(sw.models);
  assert.equal(cards.length, sw.models.length);
  assert.equal(new Set(cards.map((c) => c.slug)).size, cards.length);
  for (const c of cards) assert.equal(c.pids.length, 1);
  const c = cards.find((x) => x.name === 'C9300-48P');
  assert.equal(c.poe_budget_w, 437);
  assert.equal(c.uplink_max_gbps, 40);
  assert.equal(c.stacking, true);
  assert.equal(switchSeries(cards, sw.series).every((s) => s.cards.length > 0), true);
});

test('router cards: one PID per card, unique slugs, modules and cellular are read from the data', opts, () => {
  const cards = groupRouterCards(rt.models);
  assert.equal(cards.length, rt.models.length);
  assert.equal(new Set(cards.map((c) => c.slug)).size, cards.length);
  const c8375 = cards.find((x) => x.name === 'C8375-E-G2');
  assert.equal(c8375.modules, true);
  assert.equal(c8375.cellular, 'pluggable');
  assert.equal(cards.find((x) => x.name === 'MX68').poe, true);
  assert.equal(routerSeries(cards, rt.series)[0].hasCurrent, true);
});

test('series pages put series with current models first and End-of-Sale-only series last', opts, () => {
  for (const [bands] of [[switchSeries(groupSwitchCards(sw.models), sw.series)], [routerSeries(groupRouterCards(rt.models), rt.series)]]) {
    const firstOld = bands.findIndex((b) => !b.hasCurrent);
    if (firstOld !== -1) assert.ok(bands.slice(firstOld).every((b) => !b.hasCurrent), 'no current series after an old-only series');
  }
});

test('replacements of End-of-Sale cards resolve to published, current cards', opts, () => {
  for (const [cards] of [[groupSwitchCards(sw.models)], [groupRouterCards(rt.models)]]) {
    const lookup = cardByPid(cards);
    const old = cards.filter((c) => c.lifecycle !== 'current' && c.replacement_pids.length);
    assert.ok(old.length > 3);
    for (const c of old) for (const r of replacementCards(c, lookup)) assert.equal(r.lifecycle, 'current', `${c.name} -> ${r.name}`);
  }
});

test('switching filters: OR inside a group, AND across groups, End-of-Sale hidden unless asked', opts, () => {
  const cards = groupSwitchCards(sw.models);
  const f = (over) => cards.filter((c) => matchesWith(SWITCH_FILTERS, c, { ...emptyState(SWITCH_FILTERS), ...over }));
  const all = f({});
  assert.ok(all.every((c) => c.lifecycle === 'current'));
  assert.ok(f({ showOld: true }).length > all.length);
  assert.ok(f({ mgmt: ['cloud'] }).every((c) => c.management.includes('cloud')));
  assert.ok(f({ mgmt: ['cloud', 'cisco_business'] }).length > f({ mgmt: ['cloud'] }).length, 'OR inside a group widens');
  assert.ok(f({ mgmt: ['cloud'], stacking: true }).length < f({ mgmt: ['cloud'] }).length, 'AND across groups narrows');
  assert.ok(f({ ports: '48' }).every((c) => c.port_count >= 48));
  assert.ok(f({ poeMin: '370' }).every((c) => c.poe && c.poe_budget_w >= 370));
  assert.ok(f({ poeMin: 'any' }).every((c) => c.poe));
  assert.ok(f({ uplinkMin: '25' }).every((c) => c.uplink_max_gbps >= 25));
  assert.ok(f({ l3: true }).every((c) => c.layer3 !== 'l2'));
  // 28-, 32- and 36-port models are not lost between buckets (SPEC fix table): "at least 24" keeps every 28+ model.
  assert.ok(f({ ports: '24' }).length >= f({ ports: '48' }).length);
});

test('router filters: throughput, WAN, deployment and flags', opts, () => {
  const cards = groupRouterCards(rt.models);
  const f = (over) => cards.filter((c) => matchesWith(ROUTER_FILTERS, c, { ...emptyState(ROUTER_FILTERS), ...over }));
  assert.ok(f({}).every((c) => c.lifecycle === 'current'));
  assert.ok(f({ thrMin: '5000' }).every((c) => c.throughput_mbps >= 5000));
  assert.ok(f({ secMin: '1000' }).every((c) => c.security_throughput_mbps >= 1000));
  assert.ok(f({ wanMin: '4' }).every((c) => c.wan_port_count >= 4));
  assert.ok(f({ cellular: true }).every((c) => c.cellular !== 'none'));
  assert.ok(f({ modules: true }).every((c) => c.modules));
  assert.ok(f({ deploy: ['dc'] }).every((c) => c.deployment === 'dc' || c.deployment === 'aggregation'));
  assert.ok(f({ deploy: ['virtual'] }).every((c) => c.form_factor.includes('virtual')));
  assert.ok(f({ sdWan: true, mgmt: ['cloud'] }).length <= f({ sdWan: true }).length);
});

test('filter engine: state helpers', () => {
  const defs = FILTERS.switching;
  const empty = emptyState(defs);
  assert.equal(activeCountWith(defs, empty), 0);
  const data = new FormData();
  data.append('mgmt', 'cloud');
  data.append('ports', '24');
  data.append('stacking', '1');
  data.append('showOld', '1');
  const state = readState(defs, data);
  assert.deepEqual(state.mgmt, ['cloud']);
  assert.equal(state.ports, '24');
  assert.equal(state.stacking, true);
  assert.equal(state.showOld, true);
  assert.equal(activeCountWith(defs, state), 4);
});

test('filter panels: every group of a family has a panel field, and every panel name is a group', () => {
  for (const [family, defs] of Object.entries(FILTERS)) {
    const names = new Set(PANELS[family].flatMap((s) => (s.options.length ? s.options.map((o) => o.name ?? s.name) : [s.name])));
    for (const d of defs) assert.ok(names.has(d.id), `${family}: ${d.id} has no control`);
    for (const n of names) assert.ok(defs.some((d) => d.id === n), `${family}: control ${n} is no filter group`);
  }
});

test('switching selector: only current models, on every answer combination', opts, () => {
  const cards = groupSwitchCards(sw.models);
  const slim = cards.map((c) => c); // the page sends current cards only; the logic must also refuse others
  let runs = 0;
  for (const a of product(SWITCH_OPTIONS)) {
    const { results, relaxed } = SELECTORS.switching.recommend(slim, a);
    runs += 1;
    assert.ok(results.length <= 3);
    for (const r of results) {
      assert.equal(r.card.lifecycle, 'current', JSON.stringify(a));
      assert.ok(r.card.port_count >= Number(a.ports), `${r.card.name} has too few ports for ${JSON.stringify(a)}`);
      if (!relaxed.includes('poe') && Number(a.poeCount) > 0) {
        assert.ok(r.card.poe_budget_w >= Number(a.poeCount) * Number(a.poeWatts), `${r.card.name} budget is below the need for ${JSON.stringify(a)}`);
        assert.ok(!r.warnings.some((w) => w.startsWith('poe-short')));
      }
      if (relaxed.includes('poe') && Number(a.poeCount) > 0) assert.ok(r.warnings.some((w) => w.startsWith('poe-short')), 'a PoE shortfall is always warned');
    }
  }
  assert.equal(runs, 4 * 5 * 3 * 4 * 4 * 3);
});

test('switching selector: the recommended model leads when it fits, a larger budget wins when the need is high', opts, () => {
  const cards = groupSwitchCards(sw.models);
  const a = { ports: '24', poeCount: '24', poeWatts: '30', mgmt: 'any', uplink: 'any', extra: 'any' };
  const { results } = SELECTORS.switching.recommend(cards, a);
  assert.ok(results.length > 0);
  for (const r of results) assert.ok(r.card.poe_budget_w >= 720, `${r.card.name} must give 24 x 30 W`);
  const cloud = SELECTORS.switching.recommend(cards, { ...a, poeCount: '0', mgmt: 'cloud' }).results;
  assert.ok(cloud.every((r) => r.card.management.includes('cloud')));
  const recommended = cloud.find((r) => r.card.recommended);
  if (recommended) assert.equal(cloud[0].card.recommended, true);
});

test('router selector: only current models, on every answer combination', opts, () => {
  const cards = groupRouterCards(rt.models);
  for (const a of product(ROUTER_OPTIONS)) {
    const { results, relaxed } = SELECTORS.routing.recommend(cards, a);
    assert.ok(results.length <= 3);
    for (const r of results) {
      assert.equal(r.card.lifecycle, 'current', JSON.stringify(a));
      assert.equal(r.card.form_factor.includes('virtual'), a.where === 'virtual');
      if (a.cellular === 'yes') assert.notEqual(r.card.cellular, 'none');
      if (a.sdwan === 'yes') assert.equal(r.card.sd_wan, true);
      if (!relaxed.includes('size')) assert.ok(r.card.throughput_mbps >= Number(a.size));
      else assert.ok(r.warnings.some((w) => w.startsWith('thr-short')));
      if (r.card.licence_required === true) assert.ok(r.warnings.includes('licence'));
    }
  }
});

test('compare rows: every family reads its own fields and flags differences', opts, () => {
  const s = groupSwitchCards(sw.models).filter((c) => c.lifecycle === 'current').slice(0, 3);
  const rows = buildRows(s, 'switching');
  assert.deepEqual(rows.map((r) => r.key), ROWS_BY_FAMILY.switching.map(([k]) => k));
  assert.ok(rows.find((r) => r.key === 'poe_budget_w').values.length === 3);
  const r = groupRouterCards(rt.models).filter((c) => c.lifecycle === 'current').slice(0, 2);
  assert.ok(buildRows(r, 'routing').some((x) => x.key === 'throughput_mbps'));
});

test('every compare row and published value has a label in Turkish and English', opts, () => {
  for (const [dict, lang] of [[tr, 'tr'], [en, 'en']]) {
    const s = Object.fromEntries(Object.entries(dict).filter(([k]) => k.startsWith('val.')));
    for (const [family, cards] of [['switching', groupSwitchCards(sw.models)], ['routing', groupRouterCards(rt.models)]]) {
      for (const row of buildRows(cards, family)) {
        assert.ok(dict[`spec.${row.key}`] !== undefined || row.key === 'lifecycle', `${lang}: spec.${row.key} missing`);
        for (const v of row.values) assert.doesNotThrow(() => formatValue(row.key, v, s, lang), `${lang} ${row.key}=${JSON.stringify(v)}`);
      }
    }
  }
});

test('switching selector: a Meraki-mode twin is not shown next to its IOS XE model, and a relaxed need puts the biggest budget first', opts, () => {
  const cards = groupSwitchCards(sw.models);
  const a = { ports: '24', poeCount: '24', poeWatts: '30', mgmt: 'any', uplink: 'any', extra: 'any' };
  const names = SELECTORS.switching.recommend(cards, a).results.map((r) => r.card.name.replace(/-M$/, ''));
  assert.equal(new Set(names).size, names.length, 'no twin pair in one result');
  const huge = SELECTORS.switching.recommend(cards, { ...a, ports: '48', poeCount: '48', poeWatts: '60' });
  assert.deepEqual(huge.relaxed, ['poe']);
  const budgets = huge.results.map((r) => r.card.poe_budget_w);
  assert.deepEqual(budgets, [...budgets].sort((x, y) => y - x), 'closest (largest budget) first');
  assert.ok(huge.results.every((r) => r.warnings.some((w) => w.startsWith('poe-short'))));
});

test('config builder: only verified pairs are offered, one module slot, and the SKU string is the model plus the module', opts, async () => {
  const { optionsFor, slotLimit, buildSku, checkConfig, describe } = await import('./config-builder.mjs');
  const cards = groupSwitchCards(sw.models);
  const card = (name) => cards.find((c) => c.name === name);
  const opts = (name) => optionsFor(card(name).pids[0], sw.accessories, sw.compat).map((a) => a.pid).sort();

  assert.deepEqual(opts('C9300-48P'), ['C9300-NM-2Q', 'C9300-NM-2Y', 'C9300-NM-4G', 'C9300-NM-4M', 'C9300-NM-8X']);
  assert.deepEqual(opts('C9300X-48HX'), ['C9300X-NM-2C', 'C9300X-NM-4C', 'C9300X-NM-8M', 'C9300X-NM-8Y']);
  assert.ok(!opts('C9300X-12Y').includes('C9300X-NM-4C'), 'C9300X-12Y is not on the NM-4C list');
  assert.ok(opts('C9300X-24Y').includes('C9300X-NM-4C'), 'C9300X-24Y is');
  assert.ok(opts('C9300X-24HX').every((p) => p !== 'C9300X-NM-4C'), 'the datasheet names only 48HX, 48TX and 24Y for NM-4C');
  assert.deepEqual(opts('C9200-24PXG'), ['C9200-NM-2Q', 'C9200-NM-2Y', 'C9200-NM-4X']);
  assert.deepEqual(opts('C9200-24P'), ['C9200-NM-4G', 'C9200-NM-4X']);
  // No guessed pairs: Meraki-mode twins, fixed-uplink models and the End-of-Sale models have no builder.
  for (const name of ['C9300-48P-M', 'C9300L-24P-4X', 'C9200L-24P-4G', 'MS150-24P-4X', 'C1300-24P-4X', 'C9500-16X']) assert.deepEqual(opts(name), [], name);

  assert.equal(slotLimit(card('C9300-48P'), 'network_module'), 1);
  assert.equal(slotLimit(card('C9300L-24P-4X'), 'network_module'), 0);
  assert.equal(buildSku('C9300-48P', ['C9300-NM-8X']), 'C9300-48P + C9300-NM-8X');
  assert.equal(buildSku('C9300-48P', []), 'C9300-48P');

  const options = optionsFor('C9300-48P', sw.accessories, sw.compat);
  assert.equal(checkConfig(card('C9300-48P'), ['C9300-NM-8X'], options).ok, true);
  assert.equal(checkConfig(card('C9300-48P'), ['C9300-NM-8X', 'C9300-NM-2Q'], options).errors[0].code, 'TOO_MANY');
  assert.equal(checkConfig(card('C9300-48P'), ['C9300X-NM-8M'], options).errors[0].code, 'NOT_COMPATIBLE');
  assert.equal(describe(sw.accessories.find((a) => a.pid === 'C9300-NM-8X'), 'tr'), '8 x 10G');
});

test('published accessories: every one is current with a source, and every published pair joins two published rows', opts, () => {
  const models = new Set(sw.models.map((m) => m.pid));
  const accessories = new Set(sw.accessories.map((a) => a.pid));
  assert.ok(sw.accessories.length >= 13);
  for (const a of sw.accessories) assert.ok(a.lifecycle === 'current' && a.source_url && a.last_verified, a.pid);
  for (const c of sw.compat) assert.ok(models.has(c.model_pid) && accessories.has(c.accessory_pid), `${c.accessory_pid} + ${c.model_pid}`);
  assert.equal(sw.compat.length, 121);
});
