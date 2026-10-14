// Migration finder on the real published catalog (skipped when src/data/generated is absent): every End-of-Sale model
// is found by each of its PIDs, replacements are current, "what changes" is real and labelled in both languages.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildMigrationEntries, changesBetween } from './migration.mjs';
import { search, prepareIndex, compact } from './search.mjs';
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
const dict = {
  tr: JSON.parse(readFileSync(new URL('../i18n/tr.json', import.meta.url), 'utf8')),
  en: JSON.parse(readFileSync(new URL('../i18n/en.json', import.meta.url), 'utf8')),
};
const opts = { skip: !wl || !sw || !rt };

function entriesFor(lang) {
  const families = {};
  for (const [family, data, group] of [['wireless', wl, groupCards], ['switching', sw, groupSwitchCards], ['routing', rt, groupRouterCards]]) {
    const cards = group(data.models);
    families[family] = { cards, lookup: cardByPid(cards) };
  }
  const vals = Object.fromEntries(Object.entries(dict[lang]).filter(([k]) => k.startsWith('val.')));
  const entries = buildMigrationEntries({
    lang,
    families,
    vals,
    href: (f, s) => `/${lang}/${f}/${s}/`,
    compareHref: (f, slugs) => `/${lang}/compare/?f=${f}&m=${slugs.join(',')}`,
  });
  return { entries, families, index: prepareIndex(JSON.parse(JSON.stringify(entries))) };
}

test('every published End-of-Sale model is in the finder, and no current model is', opts, () => {
  const { entries, families } = entriesFor('tr');
  const old = Object.values(families).flatMap((f) => f.cards).filter((c) => c.lifecycle !== 'current');
  assert.equal(entries.length, old.length);
  assert.ok(entries.length > 40);
  assert.ok(entries.every((e) => e.lc === 'eos' || e.lc === 'eos_announced'));
});

test('each old PID, typed in lower case without separators, finds its model first', opts, () => {
  const { entries, index } = entriesFor('tr');
  for (const entry of entries) {
    for (const pid of entry.pids) {
      const hits = search(index, compact(pid), { limit: 3 });
      assert.ok(hits.length > 0, `${pid}: nothing found`);
      assert.ok(hits[0].entry.pids.some((p) => compact(p) === compact(pid)), `${pid}: first hit is ${hits[0].entry.title}`);
    }
  }
});

test('a replacement is a published, current model, and every old model with a replacement PID has at least one', opts, () => {
  const { entries, families } = entriesFor('tr');
  const sources = { wireless: wl, switching: sw, routing: rt };
  for (const entry of entries) {
    const rows = sources[entry.family].models.filter((m) => entry.pids.includes(m.pid));
    const hasPid = rows.some((m) => (m.replacement_pid ?? []).length > 0);
    if (hasPid) assert.ok(entry.repls.length > 0, `${entry.id} lost its replacement`);
    for (const r of entry.repls) {
      const card = families[entry.family].cards.find((c) => c.slug === r.slug);
      assert.equal(card.lifecycle, 'current', `${entry.id} -> ${r.slug} is not current`);
      assert.ok(r.compare.includes(entry.id.split('/')[1]) && r.compare.includes(r.slug));
    }
    if (!entry.repls.length) assert.ok(entry.note || entry.none, `${entry.id}: no replacement, no note, not marked as none`);
    assert.ok(entry.bulletin, `${entry.id}: no bulletin link`);
  }
});

test('"what changes" never lists the old model state and is labelled in both languages', opts, () => {
  for (const lang of ['tr', 'en']) {
    const { entries } = entriesFor(lang);
    let withChanges = 0;
    for (const entry of entries) {
      for (const r of entry.repls) {
        for (const change of r.changes) {
          assert.ok(!['lifecycle', 'last_order', 'replaced_by'].includes(change.key));
          assert.ok(dict[lang][`spec.${change.key}`], `${lang}: no label spec.${change.key}`);
          assert.notEqual(change.from, change.to);
        }
        if (r.changes.length) withChanges += 1;
      }
    }
    assert.ok(withChanges > 20, `${lang}: only ${withChanges} replacements show a change`);
  }
});

test('the MR36 example: wifi generation, management and licence change, and the old state never shows', opts, () => {
  const { entries } = entriesFor('tr');
  const mr36 = entries.find((e) => e.pids.includes('MR36'));
  assert.ok(mr36, 'MR36 is not in the finder');
  assert.ok(mr36.repls.length > 0);
  const keys = mr36.repls[0].changes.map((c) => c.key);
  for (const wanted of ['wifi_generation', 'management', 'licence']) assert.ok(keys.includes(wanted), `${wanted} missing: ${keys}`);
  assert.ok(!keys.includes('lifecycle'));
});

test('an unknown PID, a current PID and a draft PID find nothing in the finder', opts, async () => {
  const { index } = entriesFor('tr');
  assert.deepEqual(search(index, 'ZZZ-9999'), []);
  assert.deepEqual(search(index, 'C9300-48P'), []);
  const { catalog } = await loadCatalog();
  const published = new Set(index.flatMap((e) => e.pids));
  const drafts = Object.values(catalog.families).flatMap((s) => s.models).filter((r) => r.pid && r.status !== 'ready' && !published.has(r.pid));
  assert.ok(drafts.length > 100);
  for (const row of drafts) {
    const hits = search(index, row.pid, { limit: 3 });
    assert.equal(hits.some((h) => h.entry.pids.some((p) => compact(p) === compact(row.pid))), false, `${row.pid} found`);
  }
});

test('changesBetween compares two cards in the reader language', opts, () => {
  const { families } = entriesFor('tr');
  const [a, b] = families.switching.cards.filter((c) => c.lifecycle === 'current').slice(0, 2);
  const vals = Object.fromEntries(Object.entries(dict.tr).filter(([k]) => k.startsWith('val.')));
  const changes = changesBetween(a, b, 'switching', 'tr', vals);
  assert.ok(Array.isArray(changes));
  assert.deepEqual(changesBetween(a, a, 'switching', 'tr', vals), []);
});
