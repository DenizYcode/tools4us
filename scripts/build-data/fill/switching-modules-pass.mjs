// Phase 4, configuration builder: the uplink network modules of the Catalyst 9200, 9300 and 9300X, verified
// against the Catalyst 9200 and 9300 data sheets (13 Oct 2026). Only these pairs are published; every other
// accessory and compat pair stays draft (the legacy pairs were derived from series names and are not verified).
//
// What the data sheets say (exact PID to exact PID):
//  - Catalyst 9300 (modular uplinks): C9300-NM-4G, -4M, -8X, -2Q, -2Y fit every C9300 model.
//  - Catalyst 9300X: C9300X-NM-8M, -8Y, -2C fit every C9300X model; C9300X-NM-4C only fits
//    C9300X-48HX, C9300X-48TX and C9300X-24Y.
//  - Catalyst 9200: C9200-NM-4X fits every C9200 model; C9200-NM-4G fits all except C9200-24PXG and
//    C9200-48PXG; C9200-NM-2Y and C9200-NM-2Q fit only C9200-24PXG and C9200-48PXG.
// The Meraki-mode (-M) models are not paired: the Meraki datasheets name no modules.
//
// Run once: node scripts/build-data/fill/switching-modules-pass.mjs   (idempotent)

import { readWorkbook, writeWorkbook } from '../xlsx-io.mjs';
import { workbookPath } from '../catalog.mjs';

const VERIFIED = '2026-10-13';
const DS = {
  c9200: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9200-series-switches/nb-06-cat9200-ser-data-sheet-cte-en.html',
  c9300: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9300-series-switches/nb-06-cat9300-ser-data-sheet-cte-en.html',
};

const { sheets } = await readWorkbook(workbookPath('switching'), 'switching');
const model = (pid) => sheets.models.find((m) => m.pid === pid);
const inSeries = (series) => sheets.models.filter((m) => m.series === series && m.status === 'ready').map((m) => m.pid);

const c9300 = inSeries('C9300').filter((pid) => model(pid).modular_uplinks === true);
const c9300x = inSeries('C9300X').filter((pid) => model(pid).modular_uplinks === true);
const c9200 = inSeries('C9200');
const pxg = ['C9200-24PXG', 'C9200-48PXG'];

const PAIRS = {
  'C9300-NM-4G': c9300, 'C9300-NM-4M': c9300, 'C9300-NM-8X': c9300, 'C9300-NM-2Q': c9300, 'C9300-NM-2Y': c9300,
  'C9300X-NM-8M': c9300x, 'C9300X-NM-8Y': c9300x, 'C9300X-NM-2C': c9300x,
  'C9300X-NM-4C': ['C9300X-48HX', 'C9300X-48TX', 'C9300X-24Y'],
  'C9200-NM-4X': c9200, 'C9200-NM-4G': c9200.filter((pid) => !pxg.includes(pid)), 'C9200-NM-2Y': pxg, 'C9200-NM-2Q': pxg,
};
const SOURCE = { C9300: DS.c9300, C9300X: DS.c9300, C9200: DS.c9200 };

for (const [accessory, hosts] of Object.entries(PAIRS)) {
  const row = sheets.accessories.find((a) => a.pid === accessory);
  if (!row) throw new Error(`Unknown accessory ${accessory}`);
  for (const host of hosts) if (!model(host) || model(host).status !== 'ready') throw new Error(`${accessory}: ${host} is not a ready model`);
  if (hosts.length === 0) throw new Error(`${accessory} has no host`);
  const src = accessory.startsWith('C9200') ? SOURCE.C9200 : SOURCE.C9300;
  Object.assign(row, {
    status: 'ready', lifecycle: 'current', eos_announced: null, last_order: null, ldos: null, replacement_pid: null, replacement_note: null, replacement_none: null, eol_bulletin_url: null,
    datasheet_url: src, source_url: src, last_verified: VERIFIED, added_date: VERIFIED, needs_data: null,
  });
}

// Replace every pair of these accessories with the verified ones; keep all other pairs as they are.
const verified = new Set(Object.keys(PAIRS));
const kept = sheets.compat.filter((c) => !verified.has(c.accessory_pid));
const added = Object.entries(PAIRS).flatMap(([accessory, hosts]) => hosts.map((host) => ({ accessory_pid: accessory, model_pid: host, source: 'Cisco data sheet, 13 Oct 2026' })));
sheets.compat = [...kept, ...added];

await writeWorkbook(workbookPath('switching'), 'switching', sheets);
console.log(`modules: ${Object.keys(PAIRS).length} accessories ready, ${added.length} verified pairs, ${kept.length} other pairs kept (draft)`);
