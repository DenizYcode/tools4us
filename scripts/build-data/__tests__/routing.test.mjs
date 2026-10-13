// Phase 4: the verified routing set, asserted against the real workbook. The values come from the datasheets
// and bulletins listed in docs/Phase4_Routing_Verification.md; if a source changes, change both.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../catalog.mjs';

const { catalog } = await loadCatalog();
const models = catalog.families.routing.models.filter((r) => r.scope !== 'excluded');
const m = (pid) => {
  const row = models.find((r) => r.pid === pid);
  assert.ok(row, `${pid} missing`);
  return row;
};
const ready = models.filter((r) => r.status === 'ready');

test('every ready router states WAN ports, throughput and cellular, and security throughput names its licence', () => {
  assert.ok(ready.length > 90);
  for (const r of ready) {
    assert.ok(r.wan_port_count > 0 && r.throughput_mbps > 0 && r.cellular, r.pid);
    if (r.security_throughput_mbps) assert.ok(r.licence_note_tr, r.pid);
  }
});

test('throughput numbers are the datasheet figures (forwarding and IPsec for Cisco, firewall and NGFW for Meraki)', () => {
  assert.deepEqual([m('C8231-G2').throughput_mbps, m('C8231-G2').security_throughput_mbps], [19000, 5000]);
  assert.deepEqual([m('C8375-E-G2').throughput_mbps, m('C8375-E-G2').security_throughput_mbps], [38000, 20000]);
  assert.deepEqual([m('C8650-G2').throughput_mbps, m('C8650-G2').security_throughput_mbps], [540000, 225000]);
  assert.deepEqual([m('MX68').throughput_mbps, m('MX68').security_throughput_mbps], [700, 400]);
  assert.deepEqual([m('MX250').throughput_mbps, m('MX250').security_throughput_mbps], [7500, 3000]);
  assert.equal(m('MX85').max_vpn_tunnels, 200);
});

test('End-of-Sale rows never keep a security throughput that was not verified', () => {
  for (const r of ready.filter((x) => x.lifecycle !== 'current' && !['MX67C', 'MX68CW'].includes(x.pid))) {
    assert.equal(r.security_throughput_mbps, null, r.pid);
  }
});

test('ISR 1000 models named in a 2026 End-of-Sale bulletin are not current', () => {
  for (const pid of ['C1111-8P', 'C1112-8P', 'C1116-4P', 'C1117-4PM', 'C1161-8P', 'C1161X-8PLTEP', 'ISR1100-4G', 'C921-4P']) {
    assert.notEqual(m(pid).lifecycle, 'current', pid);
  }
  assert.equal(m('C1112-8P').lifecycle, 'eos_announced');
  assert.equal(m('C1112-8P').last_order, '2027-01-31');
  assert.equal(m('C1111-8P').lifecycle, 'eos');
  for (const pid of ['C1121-8P', 'C1121X-8PLTEP', 'C1126-8PLTEP', 'C1127-8PLTEP', 'C1109-4PLTE2P']) assert.equal(m(pid).lifecycle, 'current', pid);
});

test('End-of-Sale routers carry the bulletin and the replacement it names', () => {
  assert.deepEqual(m('C1111-8P').replacement_pid, ['C1121-8P']);
  assert.deepEqual(m('C1116-4P').replacement_pid, ['C1126-8PLTEP']);
  assert.deepEqual(m('C8200-1N-4T').replacement_pid, ['C8235-E-G2']);
  assert.deepEqual(m('C8500-20X6C').replacement_pid, ['C8650-G2']);
  assert.deepEqual(m('C8500L-8S4X').replacement_pid, ['C8475-G2']);
  assert.equal(m('C8300-2N2S-6T').replacement_none, true);
  assert.deepEqual(m('C927-4P').replacement_pid, ['C1127-8PLTEP']);
  assert.match(m('C927-4P').replacement_note, /C1117-4P/);
  assert.deepEqual(m('MX84').replacement_pid, ['MX85']);
  assert.equal(m('MX67C').last_order, '2026-11-27');
});

test('pluggable cellular PIDs and embedded 5G PIDs are told apart', () => {
  assert.equal(m('C1121-4PLTEP').cellular, 'pluggable');
  assert.equal(m('C8151-CVAI-G2').cellular, 'embedded');
  assert.equal(m('C8151-G2').cellular, 'pluggable');
  assert.equal(m('C8140-G2').cellular, 'none');
});

test('rows that stay draft say why', () => {
  for (const pid of ['C1131-8P', 'C8000V', 'C8111-G2-MX', 'C8455-G2-MX', 'Z4']) {
    assert.equal(m(pid).status, 'draft', pid);
    assert.ok(m(pid).needs_data, pid);
  }
  for (const pid of ['IR1101', 'IR8340']) assert.equal(m(pid).status, 'draft', pid);
});

test('at most one recommended router per series, and never an End-of-Sale one', () => {
  const picks = ready.filter((r) => r.recommended);
  assert.ok(picks.length >= 8);
  assert.equal(new Set(picks.map((r) => r.series)).size, picks.length);
  for (const r of picks) assert.equal(r.lifecycle, 'current', r.pid);
});
