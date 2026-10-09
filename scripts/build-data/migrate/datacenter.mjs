import { join } from 'node:path';
import { readLegacyCsv } from './csv.mjs';
import { toInt, parseGbpsList, toMbps, blank } from './lib.mjs';
import { decide, recordFeatures, datasheet, modelBase, accessoryBase, seriesRow } from './common.mjs';

const FAMILY = 'datacenter';
const CARD_KIND = { 'Line Card': 'line_card', Fabric: 'fabric_module', Extension: 'other', Expansion: 'other', Supervisor: 'supervisor' };

const ROLE = {
  leaf: 'leaf',
  spine: 'spine',
  'super-spine': 'super_spine',
  access: 'access',
  services: 'services',
  tor: 'tor',
  aggregation: 'aggregation',
  multiservice: 'multiservice',
  'san fabric switch': 'san_fabric',
  'san director': 'san_director',
  'san extension': 'san_extension',
};

function roles(text, source, ctx) {
  const out = [];
  for (const part of text.split('/')) {
    const t = part.replace(/\(.*?\)/g, '').trim().toLowerCase();
    if (!t) continue;
    if (!ROLE[t]) {
      decide(ctx, FAMILY, 'Role not understood', `${source}: "${part.trim()}"`);
      continue;
    }
    out.push(ROLE[t]);
  }
  return [...new Set(out)];
}

function osMode(text) {
  const t = text.toLowerCase();
  const out = [];
  if (t.startsWith('mds')) out.push('mds_nx_os');
  else if (t.includes('hyperfabric')) out.push('hyperfabric');
  else if (t.includes('nx-os')) out.push('nx_os');
  if (t.includes('aci')) out.push('aci');
  if (t.includes('hypershield')) out.push('hypershield');
  return out;
}

function management(text) {
  const t = text.toLowerCase();
  if (t.includes('hyperfabric')) return ['hyperfabric'];
  if (t.startsWith('mds')) return ['san'];
  return ['nexus'];
}

// "1/10/25G; 40/100G uplink" and "1/10/25G + 40/100G uplink" -> downlink [1,10,25], uplink [40,100].
// Plain text is all downlink.
function splitSpeeds(text) {
  const down = [];
  const up = [];
  for (const segment of text.split(/[;+]/)) (/uplink/i.test(segment) ? up : down).push(...parseGbpsList(segment));
  return { down: [...new Set(down)].sort((a, b) => a - b), up: [...new Set(up)].sort((a, b) => a - b) };
}

export function migrateDatacenter(ctx, legacyDir) {
  const models = [];
  const seriesNames = new Set();

  for (const r of readLegacyCsv(join(legacyDir, 'DC-data.csv'))) {
    const source = `DC-data.csv row ${r.__line}`;
    const paren = r.Model.match(/^(\S+)\s*\((.+)\)$/);
    const pid = paren ? paren[1] : r.Model;
    const name = paren ? paren[2] : r.Model;
    if (paren) decide(ctx, FAMILY, 'Model cell held a name as well as the PID', `${source}: "${r.Model}" -> pid ${pid}, name ${name}.`);
    const speeds = splitSpeeds(r['Downlink Speeds']);
    const maxUp = parseGbpsList(r['Max Uplink Speed']);
    const uplink = [...new Set([...speeds.up, ...maxUp])].sort((a, b) => a - b);
    const mbps = toMbps(r.Throughput);
    const features = r.Features.replace(/VXLAN EVPN/g, 'VXLAN, EVPN');
    seriesNames.add(r['Switch series']);

    if (!blank(r.Throughput) && mbps === null) decide(ctx, FAMILY, 'Throughput not numeric', `${pid} (${source}): "${r.Throughput}" left empty.`);
    const ru = (r['Form Factor (RU)'].match(/^(\d+(?:\.\d+)?)\s*RU/i) ?? [])[1];

    models.push({
      ...modelBase({
        family: FAMILY,
        pid,
        series: r['Switch series'],
        source,
        name,
        management: management(r['OS/Mode']),
        datasheetUrl: datasheet(ctx, FAMILY, source, r['Datasheet link']),
        description: [r['Short description'], r['Use case'] && `Use case: ${r['Use case']}`, r['Maximum possible port number'] && `Max ports: ${r['Maximum possible port number']}`].filter(Boolean).join(' | '),
        notes: r.Notes,
        features: r.Features,
      }),
      device_type: /^modular/i.test(r['Device Type']) ? 'modular_chassis' : 'fixed',
      roles: roles(r.Role, source, ctx),
      rack_units: ru ? Number(ru) : null,
      downlink_gbps: speeds.down,
      uplink_gbps: uplink,
      line_card_slots: toInt((r['Line Card Slots'].match(/^\d+/) ?? [])[0]),
      throughput_gbps: mbps === null ? null : Number((mbps / 1000).toFixed(3)),
      os_mode: osMode(r['OS/Mode']),
      features: recordFeatures(ctx, FAMILY, features),
    });
  }

  // Line cards, fabric and supervisor modules.
  const accessories = [];
  const compat = [];
  for (const r of readLegacyCsv(join(legacyDir, 'dc-modules-data.csv'))) {
    const source = `dc-modules-data.csv row ${r.__line}`;
    const kind = CARD_KIND[r['Card Type']];
    if (!kind) throw new Error(`${source}: unknown card type "${r['Card Type']}"`);
    accessories.push({
      ...accessoryBase({ family: FAMILY, pid: r['Card Model'], kind, source, name: r['Card Model'], datasheetUrl: null, description: [r.Detail, r.Ports && `Ports: ${r.Ports}`].filter(Boolean).join(' | '), notes: r.Notes }),
      port_count: toInt((r.Ports.match(/^(\d+)/) ?? [])[1]),
      speed_gbps: parseGbpsList(r['Port Speed']),
    });

    let hosts;
    if (r['Compatible Model'] === 'All') hosts = models.filter((m) => m.series === r['Compatible Chassis']).map((m) => m.pid);
    else hosts = r['Compatible Model'].split(',').map((t) => t.trim()).filter(Boolean);
    const known = new Set(models.map((m) => m.pid));
    for (const h of hosts) {
      if (!known.has(h)) {
        decide(ctx, FAMILY, 'Card compatibility not resolved', `${source} (${r['Card Model']}): chassis "${h}" is not a model in DC-data.csv.`);
        continue;
      }
      compat.push({ accessory_pid: r['Card Model'], model_pid: h, source: `legacy "Compatible Model" = ${r['Compatible Model']} (${r['Compatible Chassis']})` });
    }
    if (!hosts.length) decide(ctx, FAMILY, 'Card without a host', `${source} (${r['Card Model']}): no chassis resolved.`);
  }
  decide(ctx, FAMILY, 'Card compatibility "All"', `Where dc-modules-data.csv says "All", the card was paired with every model whose series equals "Compatible Chassis". Verify against datasheets.`);

  return { models, accessories, compat, series: [...seriesNames].sort().map((s) => seriesRow(FAMILY, s)) };
}
