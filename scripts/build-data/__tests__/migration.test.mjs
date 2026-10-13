// Invariants of the one-time legacy migration, asserted against the real workbooks in data/catalog/.
// They describe the seeded state (what the audit asked for). If you deliberately change the catalog
// (for example mark rows ready, or move eos_announced to eos after a last order date), update the test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../catalog.mjs';
import { buildFamilyJson } from '../emit.mjs';
import { validateCatalog } from '../validate.mjs';

const { catalog, problems } = await loadCatalog();
const fam = (f) => catalog.families[f];
const model = (f, pid) => fam(f).models.find((m) => m.pid === pid);
const accessory = (f, pid) => fam(f).accessories.find((a) => a.pid === pid);
const allPids = Object.values(catalog.families).flatMap((f) => [...f.models, ...f.accessories].map((r) => r.pid));

test('workbooks load with no structural problems and the catalog validates', () => {
  assert.deepEqual(problems.filter((p) => p.level === 'error'), []);
  assert.deepEqual(validateCatalog(catalog).errors, []);
});

test('only ready, in-scope rows reach the site data, and none is left unverified', () => {
  for (const [family, sheets] of Object.entries(catalog.families)) {
    const json = buildFamilyJson(family, sheets);
    const ready = (rows) => rows.filter((r) => r.status === 'ready' && r.scope !== 'excluded');
    assert.equal(json.models.length, ready(sheets.models).length, `${family} models`);
    assert.equal(json.accessories.length, ready(sheets.accessories).length, `${family} accessories`);
    for (const row of [...json.models, ...json.accessories]) assert.ok(['current', 'eos_announced', 'eos'].includes(row.lifecycle), `${family} ${row.pid}`);
  }
});

test('only wireless, switching and routing models are ready so far (Phases 3-4); every accessory and the data centre family are still draft', () => {
  for (const [family, sheets] of Object.entries(catalog.families)) {
    const ready = [...sheets.models, ...sheets.accessories].filter((r) => r.status === 'ready');
    if (family === 'wireless' || family === 'switching' || family === 'routing') assert.ok(ready.every((r) => sheets.models.includes(r)), `${family} accessories are still draft`);
    else assert.equal(ready.length, 0, `${family}: rows were marked ready, update this test and the lifecycle expectations below`);
  }
});

test('PIDs: one per row, no spare suffix, no lists (rules/data.md)', () => {
  const bad = allPids.filter((p) => /[=,]|\s{2,}/.test(p) || (p.includes('/') && !/^N560-IMA-8Q\/4L$/.test(p)));
  assert.deepEqual(bad, []);
  assert.equal(new Set(allPids).size, allPids.length);
});

test('audit #13-#15: 28- and 32-port switches have a numeric port count', () => {
  assert.equal(model('switching', 'C9500X-28C8D').port_count, 28);
  assert.equal(model('switching', 'C9500-32C').port_count, 32);
  assert.equal(model('switching', 'C9500-32QC').port_count, 32);
});

test('audit #3: modular-uplink switches carry the speeds their modules or supervisors can provide', () => {
  const modular = fam('switching').models.filter((m) => m.modular_uplinks);
  assert.ok(modular.length > 0);
  assert.equal(modular.length, 64); // the audit counts 64 such models
  // C9606R and C9610R have line cards but no supervisors in the legacy data: left empty and reported, not guessed.
  const empty = modular.filter((m) => !m.uplink_gbps?.length).map((m) => m.pid).sort();
  assert.deepEqual(empty, ['C9606R', 'C9610R']);
  assert.ok(model('switching', 'C9300-24T').uplink_gbps.includes(10));
});

test('a module listed under several series is one accessory with exact compat pairs', () => {
  const rows = fam('switching').accessories.filter((a) => a.pid === 'C9300-NM-4G');
  assert.equal(rows.length, 1);
  const hosts = fam('switching').compat.filter((c) => c.accessory_pid === 'C9300-NM-4G').map((c) => c.model_pid);
  assert.ok(hosts.length > 1);
  for (const pid of hosts) assert.equal(model('switching', pid).accepts_modules, true);
});

test('wireless: two-SKU rows are split, and IW9165 bands parse', () => {
  assert.ok(model('wireless', 'CW9178I-CFG'));
  assert.ok(model('wireless', 'CW9178I-RTG'));
  assert.equal(model('wireless', 'CW9178I-CFG').series, model('wireless', 'CW9178I-RTG').series);
  assert.deepEqual(model('wireless', 'IW9165E-E-AP').bands_ghz, [5, 6]);
});

test('wireless antennas: spare "=" and "/RS" variants become single PIDs, compat is exact', () => {
  assert.ok(accessory('wireless', 'AIR-ANT2524V4C-R'));
  assert.ok(accessory('wireless', 'AIR-ANT2524V4C-RS'));
  assert.equal(accessory('wireless', 'AIR-ANT2524V4C-R/RS'), undefined);
  assert.ok(fam('wireless').compat.some((c) => c.accessory_pid === 'AIR-ANT2566D4M-R' && c.model_pid === 'CW9179F'));
  // MR46 antennas must not attach to MR46E by substring.
  const mr46 = fam('wireless').compat.filter((c) => c.model_pid === 'MR46');
  assert.deepEqual(mr46, []);
});

test('data center: uplink speeds are not in the downlink array; SAN switches carry no VXLAN/EVPN', () => {
  const leaf = model('datacenter', 'N9K-C93180YC-FX3');
  assert.ok(leaf.uplink_gbps.length > 0);
  assert.ok(Math.max(...leaf.downlink_gbps) < Math.min(...leaf.uplink_gbps));
  const mds = model('datacenter', 'DS-C9706');
  assert.ok(mds, 'MDS model cell split into PID and name');
  assert.ok(!mds.features.includes('vxlan') && !mds.features.includes('evpn'));
  assert.ok(mds.features.includes('ivr'));
});

test('router modules: datasheet links are full https URLs (audit #264-#290)', () => {
  for (const a of fam('routing').accessories) assert.ok(a.datasheet_url === null || a.datasheet_url.startsWith('https://'), a.pid);
  assert.ok(fam('routing').accessories.filter((a) => a.datasheet_url).length >= 20);
});

test('carrier-grade ASR and NCS routers are excluded; Catalyst 8500 and industrial routers are not', () => {
  const excluded = fam('routing').models.filter((m) => m.scope === 'excluded');
  assert.equal(excluded.length, 51);
  assert.ok(excluded.every((m) => /^(ASR|NCS)/i.test(m.series)));
  assert.equal(model('routing', 'C8500-12X').scope, 'in');
  const ir = fam('routing').models.find((m) => m.series === 'IR1101');
  assert.equal(ir.scope, 'in');
});

test('routers: throughput is numeric Mbps or empty, never text', () => {
  const r = model('routing', 'C1121-4P');
  assert.equal(typeof r.throughput_mbps === 'number' || r.throughput_mbps === null, true);
  assert.equal(fam('routing').models.filter((m) => m.throughput_mbps !== null && typeof m.throughput_mbps !== 'number').length, 0);
});

// Lifecycle seed (audit Lifecycle tab)
const life = (f, pid) => {
  const m = model(f, pid) ?? accessory(f, pid);
  assert.ok(m, `${pid} missing`);
  return m;
};

test('lifecycle: audited end-of-sale models carry status, last order, bulletin and a replacement', () => {
  const cases = [
    ['switching', 'MS210-24-HW', 'eos', '2026-04-30'],
    ['switching', 'C9500-16X', 'eos', '2026-04-30'],
    ['switching', 'C9400-SUP-1', 'eos', '2025-04-30'],
    ['switching', 'MS450-12-HW', 'eos_announced', '2026-10-29'],
    ['routing', 'ISR1100-4G', 'eos', '2026-07-28'],
    ['routing', 'MX84', 'eos', '2021-10-31'],
    ['routing', 'C8200-1N-4T', 'eos_announced', '2027-07-31'],
    ['wireless', 'C9105AXI', 'eos_announced', '2026-12-31'],
    ['wireless', 'MR36', 'eos_announced', '2026-12-31'],
    ['datacenter', 'N9K-C9364C', 'eos', '2024-01-30'],
    ['datacenter', 'N9K-X9736C-FX', 'eos_announced', '2027-07-31'],
  ];
  for (const [f, pid, lifecycle, lastOrder] of cases) {
    const m = life(f, pid);
    assert.equal(m.lifecycle, lifecycle, pid);
    assert.equal(m.last_order, lastOrder, pid);
    assert.ok(m.eol_bulletin_url?.startsWith('https://'), `${pid} bulletin`);
    assert.ok(m.replacement_pid?.length || m.replacement_note || m.replacement_none, `${pid} replacement`);
  }
});

test('lifecycle: replacements that exist in the catalog become PID links, others stay notes', () => {
  assert.deepEqual(life('datacenter', 'N9K-C9364C').replacement_pid, ['N9K-C9364C-GX']);
  // C9500-32QC is not published yet, so the MS450 bulletin's replacement stays a note until it is.
  assert.equal(life('switching', 'MS450-12-HW').replacement_pid, null);
  assert.match(life('switching', 'MS450-12-HW').replacement_note, /C9500-32QC/);
  assert.deepEqual(life('switching', 'MS210-24-HW').replacement_pid, ['MS150-24T-4G']);
  assert.deepEqual(life('routing', 'C8200-1N-4T').replacement_pid, ['C8235-E-G2']);
  assert.deepEqual(life('routing', 'MX84').replacement_pid, ['MX85']);
  // The Meraki-managed Catalyst replacements of the MX67C/MX68CW are not published yet, so they stay notes.
  assert.equal(life('routing', 'MX67C').replacement_pid, null);
  assert.match(life('routing', 'MX67C').replacement_note, /C8111-C-G2-MX/);
  assert.match(life('routing', 'MX68CW').replacement_note, /C8121-CW-G2-MX/);
  assert.deepEqual(life('routing', 'C8500-12X').replacement_pid, ['C8550-G2']);
  assert.equal(life('routing', 'C8300-2N2S-4T2X').replacement_none, true);
});

test('lifecycle: unverified groups stay empty rather than being guessed', () => {
  for (const [f, pid] of [['switching', 'IE-3300-8T2S'], ['datacenter', 'DS-C9148T']]) {
    const m = model(f, pid);
    if (m) assert.equal(m.lifecycle, null, pid);
  }
});

test('audit #18/#19: end-of-sale network modules have no replacement; the switches carry the replacement PID', () => {
  assert.equal(life('switching', 'C9500-NM-8X').replacement_none, true);
  assert.equal(life('switching', 'C9500-NM-2Q').replacement_none, true);
  assert.equal(life('switching', 'C9500-NM-8X').replacement_pid, null);
  assert.deepEqual(life('switching', 'C9500-16X').replacement_pid, ['C9500-24Y4C']);
});

test('current rows carry no end-of-sale bulletin, and unconfirmed lifecycles are flagged per row', () => {
  for (const sheets of Object.values(catalog.families)) {
    for (const r of [...sheets.models, ...sheets.accessories]) {
      if (r.lifecycle === 'current') assert.equal(r.eol_bulletin_url, null, r.pid);
    }
  }
  // Wireless rows were verified in Phase 3, so their legacy flag is cleared; the draft extender keeps its reason.
  assert.equal(model('wireless', 'C9136I').needs_data, null);
  assert.match(model('wireless', 'CBW151AXM-E-EU').needs_data, /datasheet does not state ports/i);
});

test('inferred values are left empty, not false (ac_powered, poe, uplink_mgig)', () => {
  assert.equal(catalog.families.wireless.models.filter((m) => m.ac_powered === false).length, 0);
  assert.equal(catalog.families.wireless.models.filter((m) => m.uplink_mgig === false).length, 0);
  // A draft switching row never gets poe=no from the migration; only verified (ready) rows state it.
  assert.equal(catalog.families.switching.models.filter((m) => m.poe === false && m.status !== 'ready').length, 0);
  assert.equal(catalog.families.routing.models.filter((m) => m.poe === false).length, 0);
});

test('bare cisco.com links were repaired to www.cisco.com', () => {
  for (const a of catalog.families.routing.accessories) assert.ok(!a.datasheet_url || !a.datasheet_url.startsWith('https://cisco.com/'), a.pid);
});
