import { join } from 'node:path';
import { readLegacyCsv } from './csv.mjs';
import { clean, yesNo, toInt, parseGbpsList, blank } from './lib.mjs';
import { decide, recordFeatures, datasheet, modelBase, accessoryBase, seriesRow } from './common.mjs';

const FAMILY = 'switching';
const ACCESSORY_KIND = { Module: 'network_module', 'Line Card': 'line_card', Supervisor: 'supervisor' };
const FORM = { Rack: 'rack', Rugged: 'rugged', Desktop: 'desktop', Chassis: 'chassis' };

function management(legacyFamily, unified) {
  if (legacyFamily === 'Meraki') return ['cloud'];
  if (legacyFamily === 'Cisco Business') return ['cisco_business'];
  if (legacyFamily === 'Catalyst') return unified ? ['on_prem', 'cloud'] : ['on_prem'];
  throw new Error(`Unknown switching family "${legacyFamily}"`);
}

function roles(text) {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].map((t) => {
    if (t === 'core') return 'core';
    if (t === 'distribution') return 'distribution';
    if (t === 'access') return 'access';
    throw new Error(`Unknown switch category "${t}"`);
  });
}

function media(text) {
  const t = text.toLowerCase();
  const out = [];
  if (t.includes('copper')) out.push('copper');
  if (t.includes('fiber')) out.push('fiber');
  if (t.includes('hybrid')) out.push('hybrid');
  return out;
}

function layer3(text) {
  switch (text) {
    case 'Full L3':
      return 'full_l3';
    case 'Basic L3':
      return 'basic_l3';
    case 'L2 Access':
    case 'Layer 2 Access':
      return 'l2';
    case 'Unmanaged':
      return 'unmanaged';
    default:
      return null;
  }
}

function poe(text, features) {
  const hasPoeFeature = features.some((f) => f.toLowerCase() === 'poe');
  switch (text) {
    case '':
      return { poe: hasPoeFeature ? true : false, type: null, coverage: null, flagged: hasPoeFeature };
    case 'PoE+':
      return { poe: true, type: 'poe_plus', coverage: null };
    case 'PoE+ (Full)':
      return { poe: true, type: 'poe_plus', coverage: 'all' };
    case 'PoE (Partial)':
      return { poe: true, type: 'poe', coverage: 'partial' };
    case 'UPOE':
      return { poe: true, type: 'upoe', coverage: null };
    case 'UPOE+':
      return { poe: true, type: 'upoe_plus', coverage: null };
    case '4PPoE':
      return { poe: true, type: 'fourpair', coverage: null };
    case 'Dependent on Line Card':
      return { poe: true, type: null, coverage: 'line_card' };
    default:
      throw new Error(`Unknown PoE type "${text}"`);
  }
}

export function migrateSwitching(ctx, legacyDir) {
  const rows = readLegacyCsv(join(legacyDir, 'switching.csv'));
  const models = [];
  const accessories = new Map(); // pid -> row
  const accessoryGroups = new Map(); // pid -> Set("Family|Supertype")
  const seriesNames = new Set();

  for (const r of rows) {
    const source = `switching.csv row ${r.__line}`;
    const kind = ACCESSORY_KIND[r['Switch Type']];

    if (kind) {
      // Modules, line cards and supervisors: one accessory per PID, however many series list it.
      let acc = accessories.get(r.Model);
      if (!acc) {
        const down = parseGbpsList(r['Downlink Port speed']);
        const up = parseGbpsList(r['Uplink Speed']);
        const count = toInt(r['Uplink port count']) ?? toInt(r['Downlink Port Count']);
        acc = {
          ...accessoryBase({ family: FAMILY, pid: r.Model, kind, source, name: r.Model, datasheetUrl: datasheet(ctx, FAMILY, source, r.Datasheet), description: r.Description, notes: r.Notes }),
          port_count: count,
          speed_gbps: up.length ? up : down,
          media: media(`${r['Uplink Port type']} ${r['Downlink Type']}`),
        };
        accessories.set(r.Model, acc);
        accessoryGroups.set(r.Model, new Set());
      }
      accessoryGroups.get(r.Model).add(`${r.Family}|${r.Supertype}`);
      continue;
    }

    const form = FORM[r['Switch Type']];
    if (!form) throw new Error(`${source}: unknown switch type "${r['Switch Type']}"`);
    seriesNames.add(r.Supertype);
    const unified = yesNo(r['Unified Architecture']);
    const featureList = r.Features.split(',').map((f) => f.trim());
    const down = parseGbpsList(r['Downlink Port speed']);
    const upText = r['Uplink Speed'];
    const modularUplinks = upText === 'Modular' || r['Uplink Port type'] === 'Modular';
    const up = modularUplinks ? [] : parseGbpsList(upText);
    const p = poe(r['PoE type'], featureList);
    if (p.flagged) decide(ctx, FAMILY, 'PoE type missing though the model is marked PoE', `${r.Model} (${source}): features say PoE but "PoE type" is empty. poe=yes; poe_type left empty.`);
    if (!blank(r['Downlink Port speed']) && !down.length && r['Downlink Port speed'] !== 'Modular') {
      decide(ctx, FAMILY, 'Downlink speed not understood', `${r.Model} (${source}): "${r['Downlink Port speed']}"`);
    }
    if (!blank(r['Downlink Port Count']) && toInt(r['Downlink Port Count']) === null) {
      decide(ctx, FAMILY, 'Port count not numeric', `${r.Model} (${source}): "${r['Downlink Port Count']}"`);
    }

    models.push({
      ...modelBase({
        family: FAMILY,
        pid: r.Model,
        series: r.Supertype,
        source,
        name: r.Model,
        management: management(r.Family, unified),
        datasheetUrl: datasheet(ctx, FAMILY, source, r.Datasheet),
        description: r.Description,
        notes: r.Notes,
        features: r.Features,
      }),
      switch_form: form,
      roles: roles(r['Switch Category']),
      port_count: toInt(r['Downlink Port Count']),
      downlink_gbps: down,
      downlink_media: media(r['Downlink Type']),
      uplink_count: toInt(r['Uplink port count']),
      uplink_gbps: up,
      uplink_media: media(r['Uplink Port type']),
      modular_uplinks: modularUplinks || null,
      poe: p.poe,
      poe_type: p.type,
      poe_coverage: p.coverage,
      stacking: yesNo(r.Stacking),
      layer3: layer3(r['Layer3 support']),
      mgig: featureList.includes('Multigigabit') || down.some((g) => g === 2.5 || g === 5) || null,
      line_card_slots: toInt(r['Line Cards Supported']),
      accepts_modules: yesNo(r['Modules supported']),
      unified,
      features: recordFeatures(ctx, FAMILY, r.Features),
      __legacyFamily: r.Family,
      __legacySupertype: r.Supertype,
    });
  }

  // Compatibility: a module, line card or supervisor listed under a series fits the models of the same
  // legacy Family + Supertype that take modules, line cards or supervisors.
  const compat = [];
  for (const [pid, groups] of accessoryGroups) {
    const acc = accessories.get(pid);
    for (const group of groups) {
      const [legacyFamily, supertype] = group.split('|');
      const hosts = models.filter((m) => {
        if (m.__legacyFamily !== legacyFamily || m.__legacySupertype !== supertype) return false;
        return acc.kind === 'network_module' ? m.accepts_modules === true : m.switch_form === 'chassis';
      });
      if (!hosts.length) decide(ctx, FAMILY, 'Accessory with no host model', `${pid} (${group.replace('|', ' / ')}): no model in that series takes it; no compat rows.`);
      for (const h of hosts) {
        if (!compat.some((c) => c.accessory_pid === pid && c.model_pid === h.pid)) {
          compat.push({ accessory_pid: pid, model_pid: h.pid, source: `legacy series grouping (${group.replace('|', ' / ')})` });
        }
      }
    }
  }
  decide(ctx, FAMILY, 'Compatibility is derived', `The legacy data lists each module, line card and supervisor under a series, not against exact models. ${compat.length} exact pairs were generated from that grouping (modules: models with "Modules supported = Yes"; line cards and supervisors: chassis). Verify against datasheets before marking models ready.`);

  // Models with modular uplinks get the speeds their compatible modules can provide (audit #3).
  const speedsByHost = new Map();
  for (const c of compat) {
    const acc = accessories.get(c.accessory_pid);
    if (acc.kind === 'line_card') continue;
    const set = speedsByHost.get(c.model_pid) ?? new Set();
    for (const g of acc.speed_gbps ?? []) set.add(g);
    speedsByHost.set(c.model_pid, set);
  }
  const noSpeeds = [];
  for (const m of models) {
    if (!m.modular_uplinks) continue;
    m.uplink_gbps = [...(speedsByHost.get(m.pid) ?? [])].sort((a, b) => a - b);
    if (!m.uplink_gbps.length) noSpeeds.push(m.pid);
  }
  if (noSpeeds.length) {
    decide(ctx, FAMILY, 'Modular uplinks with no module or supervisor data', `${noSpeeds.join(', ')}: the legacy data lists line cards but no supervisors or network modules for these chassis, so uplink_gbps stays empty. Add the uplink speeds from the datasheet.`);
  }

  return {
    models,
    accessories: [...accessories.values()],
    compat,
    series: [...seriesNames].sort().map((s) => seriesRow(FAMILY, s)),
  };
}
