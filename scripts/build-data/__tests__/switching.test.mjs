// Phase 4: the verified switching set, asserted against the real workbook. These values come from the
// datasheets listed in docs/Phase4_Switching_Verification.md; if a datasheet changes, change both.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../catalog.mjs';

const { catalog } = await loadCatalog();
const models = catalog.families.switching.models;
const m = (pid) => {
  const row = models.find((r) => r.pid === pid);
  assert.ok(row, `${pid} missing`);
  return row;
};
const ready = models.filter((r) => r.status === 'ready');

test('every ready switch states PoE yes or no, and a PoE switch states type and watts', () => {
  assert.ok(ready.length > 150);
  for (const r of ready) {
    assert.equal(typeof r.poe, 'boolean', r.pid);
    if (r.poe) assert.ok(r.poe_budget_w > 0 && r.poe_type, r.pid);
    else assert.ok(r.poe_budget_w === null && r.poe_type === null, r.pid);
  }
});

test('PoE budgets are the datasheet values with the default power supply', () => {
  assert.equal(m('C9300-48P').poe_budget_w, 437);
  assert.equal(m('C9300-24P').poe_budget_w, 445);
  assert.equal(m('C9200L-24P-4G').poe_budget_w, 370);
  assert.equal(m('C9200L-48P-4G').poe_budget_w, 740);
  assert.equal(m('C9300X-24HX').poe_budget_w, 735);
  assert.equal(m('MS150-48FP-4X').poe_budget_w, 740);
  assert.equal(m('CBS220-24FP-4G').poe_budget_w, 382);
  // The -M twin has the same budget as the IOS XE model (Meraki datasheets).
  assert.equal(m('C9300-24P-M').poe_budget_w, m('C9300-24P').poe_budget_w);
  // Where the datasheet disagrees with itself, the lower value is used and the note says so.
  assert.equal(m('C1300-48P-4X').poe_budget_w, 370);
  assert.match(m('C1300-48P-4X').poe_note_tr, /370 W/);
});

test('corrections to the legacy file: MS130 X models have PoE, MS150 stacks, MP ports are 5G', () => {
  for (const pid of ['MS130-8X-HW', 'MS130-12X-HW', 'MS130-24X-HW', 'MS130-48X-HW']) assert.equal(m(pid).poe, true, pid);
  assert.equal(m('MS150-24P-4X').stacking, true);
  assert.deepEqual(m('MS150-48MP-4X').downlink_gbps, [5]);
  assert.equal(m('MS130-24P-HW').stacking, false);
});

test('Catalyst 1300 stacking follows the datasheet list: 10G-uplink models stack, -2G and -4G models do not', () => {
  assert.equal(m('C1300-24P-4X').stacking, true);
  assert.equal(m('C1300-24P-4G').stacking, false);
  assert.equal(m('C1300X-24P-4X').stacking, true);
});

test('Meraki-mode Catalyst models are cloud only and list static routing and OSPF, not full layer 3', () => {
  for (const r of ready.filter((x) => x.pid.endsWith('-M'))) {
    assert.deepEqual(r.management, ['cloud'], r.pid);
    assert.equal(r.layer3, 'basic_l3', r.pid);
    assert.equal(r.licence_required, true, r.pid);
  }
});

test('End-of-Sale switches carry the bulletin and the replacement the bulletin names', () => {
  const ms210 = { 'MS210-24-HW': 'MS150-24T-4G', 'MS210-24P-HW': 'MS150-24P-4G', 'MS210-48-HW': 'MS150-48T-4G', 'MS210-48LP-HW': 'MS150-48LP-4G', 'MS210-48FP-HW': 'MS150-48FP-4G' };
  for (const [pid, repl] of Object.entries(ms210)) {
    assert.equal(m(pid).lifecycle, 'eos', pid);
    assert.deepEqual(m(pid).replacement_pid, [repl], pid);
    assert.equal(m(pid).last_order, '2026-04-30', pid);
  }
  assert.equal(m('MS450-12-HW').lifecycle, 'eos_announced');
  assert.equal(m('MS450-12-HW').last_order, '2026-10-29');
  assert.deepEqual(m('C9500-16X').replacement_pid, ['C9500-24Y4C']);
  assert.equal(m('C9500-16X').lifecycle, 'eos');
});

test('rows that stay draft say why', () => {
  for (const pid of ['C1200-8T-D', 'C1300-12XS', 'C1300-24XT']) {
    assert.equal(m(pid).status, 'draft', pid);
    assert.match(m(pid).needs_data, /uplink/i, pid);
  }
  // Out of the core set: no verified data, no published row.
  for (const pid of ['IE-3300-8T2S', 'C9404R', 'CBS110-24T']) assert.equal(m(pid).status, 'draft', pid);
});

test('at most one recommended model per series, and never an End-of-Sale one', () => {
  const picks = ready.filter((r) => r.recommended);
  assert.ok(picks.length >= 15);
  assert.equal(new Set(picks.map((r) => r.series)).size, picks.length);
  for (const r of picks) assert.equal(r.lifecycle, 'current', r.pid);
});
