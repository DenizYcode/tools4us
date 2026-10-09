import { join } from 'node:path';
import { readLegacyCsv } from './csv.mjs';
import { clean, yesNo, toInt, parseGbpsList, toMbps, blank } from './lib.mjs';
import { decide, recordFeatures, datasheet, modelBase, accessoryBase, seriesRow } from './common.mjs';

const FAMILY = 'routing';
const MODULE_KIND = { PIM: 'pim', SM: 'sm', NIM: 'nim', IM: 'im' };

function management(legacyFamily, unified) {
  if (legacyFamily === 'Meraki') return ['cloud'];
  if (legacyFamily === 'Catalyst') return unified ? ['on_prem', 'cloud'] : ['on_prem'];
  if (legacyFamily === 'ASR') return ['on_prem'];
  throw new Error(`Unknown routing family "${legacyFamily}"`);
}

function formFactor(text) {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].map((t) => {
    if (['rack', 'desktop', 'chassis', 'rugged', 'virtual'].includes(t)) return t;
    throw new Error(`Unknown router device type "${t}"`);
  });
}

function deployment(text) {
  const t = text.toLowerCase();
  if (t.startsWith('virtual')) return 'virtual';
  if (['small', 'medium', 'large', 'aggregation', 'dc'].includes(t)) return t;
  throw new Error(`Unknown deployment category "${text}"`);
}

function cellular(text) {
  if (blank(text)) return { value: null };
  if (/^optional pluggable/i.test(text)) return { value: 'pluggable' };
  if (/^embedded/i.test(text)) return { value: 'embedded' };
  if (text === 'Yes') return { value: 'embedded', assumed: true };
  return { value: null, unknown: true };
}

const maxGbps = (text) => {
  const g = parseGbpsList(text);
  return g.length ? Math.max(...g) : null;
};

export function migrateRouting(ctx, legacyDir) {
  const rows = readLegacyCsv(join(legacyDir, 'routers.csv'));
  const models = [];
  const seriesNames = new Set();
  let excluded = 0;
  let noThroughput = 0;

  for (const r of rows) {
    const source = `routers.csv row ${r.__line}`;
    const unified = yesNo(r['Unified architecture']);
    const feats = r.Features.split(',').map((f) => f.trim());
    const cell = cellular(r.Cellular);
    if (cell.assumed) decide(ctx, FAMILY, 'Cellular "Yes" read as embedded', `${r.Model} (${source}): legacy says "Yes"; stored as cellular=embedded. Confirm.`);
    if (cell.unknown) decide(ctx, FAMILY, 'Cellular value not understood', `${r.Model} (${source}): "${r.Cellular}"`);

    const throughput = toMbps(r.Throughput);
    if (!blank(r.Throughput) && throughput === null) decide(ctx, FAMILY, 'Throughput not numeric', `${r.Model} (${source}): "${r.Throughput}" left empty.`);
    if (blank(r.Throughput)) noThroughput += 1;
    const security = toMbps(r['Advanced Security Throughput']);
    if (!blank(r['Advanced Security Throughput']) && security === null) decide(ctx, FAMILY, 'Security throughput not numeric', `${r.Model} (${source}): "${r['Advanced Security Throughput']}" left empty.`);

    const wanModular = r['WAN ports amount'] === 'Modular';
    const lanModular = r['LAN ports amount'] === 'Modular';
    const carrier = /^(ASR|NCS)/i.test(r.Supertype);
    if (carrier) excluded += 1;
    seriesNames.add(r.Supertype);

    const detail = [
      r.Description,
      r['WAN ports detail'] && `WAN: ${r['WAN ports detail']}`,
      r['LAN ports detail'] && `LAN: ${r['LAN ports detail']}`,
      r['PIM types'] && `PIM: ${r['PIM types']}`,
      r['SM types'] && `SM: ${r['SM types']}`,
      r['NIM types'] && `NIM: ${r['NIM types']}`,
      r['Ordering information'] && `Ordering: ${r['Ordering information']}`,
    ].filter(Boolean).join(' | ');

    models.push({
      ...modelBase({
        family: FAMILY,
        pid: r.Model,
        series: r.Supertype,
        source,
        name: r.Model,
        management: management(r.Family, unified),
        datasheetUrl: datasheet(ctx, FAMILY, source, r.Datasheet),
        description: detail,
        notes: r.Notes,
        features: r.Features,
      }),
      scope: carrier ? 'excluded' : 'in',
      form_factor: formFactor(r['Device Type']),
      deployment: deployment(r['Deployment Category']),
      sd_wan: yesNo(r['SD-WAN']),
      unified,
      antenna: yesNo(r.Antenna),
      wan_port_count: wanModular ? null : toInt(r['WAN ports amount']),
      wan_port_max_gbps: maxGbps(r['WAN port max']),
      lan_port_count: lanModular ? null : toInt(r['LAN ports amount']),
      lan_port_max_gbps: maxGbps(r['LAN port max']),
      modular_ports: wanModular || lanModular || null,
      module_slots: toInt(r['Modular Slots']),
      pim_slots: toInt(r['PIM Modules']),
      sm_slots: toInt(r['SM Modules']),
      nim_slots: toInt(r['NIM Modules']),
      cellular: cell.value,
      throughput_mbps: throughput,
      security_throughput_mbps: security,
      max_vpn_tunnels: toInt(r['Recommended Max VPN Tunnels']),
      poe: feats.includes('PoE') ? true : null,
      features: recordFeatures(ctx, FAMILY, r.Features),
    });
  }

  decide(ctx, FAMILY, 'Carrier-grade rows excluded', `${excluded} routers in the ASR and NCS product lines (ASR 900/920/9000, NCS 540/560/5500/5700) are scope=excluded: kept in the workbook, skipped by every check, never on the site. This is by product line (Supertype starts with ASR or NCS), not by the legacy "Aggregation" category, which would also have caught Catalyst 8500 and industrial IR routers. Change scope to "in" to bring any back.`);
  decide(ctx, FAMILY, 'Throughput missing in the legacy data', `${noThroughput} routers have no throughput. throughput_mbps is left empty, so they must be excluded from throughput queries explicitly (audit "Filter tests").`);
  decide(ctx, FAMILY, 'Meraki MX and Z rows', 'The legacy router file also holds Meraki MX, vMX and Z-Series appliances. Decision of 10 Oct 2026: Meraki MX stays in Routing next to the Catalyst routers (there is no separate Security family at launch). The management filter separates cloud (Meraki) from on-prem (Catalyst) models.');

  // Router modules.
  const accessories = [];
  const compat = [];
  const byPid = new Map(models.map((m) => [m.pid, m]));
  const resolve = (token) => {
    if (byPid.has(token)) return [token];
    const bySeries = models.filter((m) => m.series === token).map((m) => m.pid);
    if (bySeries.length) return bySeries;
    return models.filter((m) => m.pid.startsWith(`${token}-`)).map((m) => m.pid);
  };
  for (const r of readLegacyCsv(join(legacyDir, 'router-modules.csv'))) {
    const source = `router-modules.csv row ${r.__line}`;
    const kind = MODULE_KIND[r['Module type']];
    if (!kind) throw new Error(`${source}: unknown module type "${r['Module type']}"`);
    const tokens = r['Supported router models'].split(',').map((t) => t.trim()).filter(Boolean);
    const targets = new Set();
    for (const token of tokens) {
      const found = resolve(token);
      if (!found.length) decide(ctx, FAMILY, 'Module compatibility not resolved', `${source} (${r['Module name']}): "${token}" matches no router PID or series.`);
      found.forEach((p) => targets.add(p));
    }
    const live = [...targets].filter((p) => byPid.get(p).scope === 'in');
    const carrierOnly = (targets.size > 0 && live.length === 0) || (!tokens.length && /^(A900|N560)/.test(r['Module name']));
    if (!tokens.length && !carrierOnly) decide(ctx, FAMILY, 'Module without compatibility', `${source} (${r['Module name']}): no "Supported router models".`);
    const { url } = { url: datasheet(ctx, FAMILY, source, r.Datasheet) };
    accessories.push({
      ...accessoryBase({
        family: FAMILY,
        pid: r['Module name'],
        kind,
        source,
        name: r['Module name'],
        datasheetUrl: url,
        description: [r['Layman description'], r.Ports && `Ports: ${r.Ports}`].filter(Boolean).join(' | '),
        notes: r.Notes,
      }),
      scope: carrierOnly ? 'excluded' : 'in',
      port_count: toInt((r.Ports.match(/^(\d+)x/) ?? [])[1]),
    });
    if (!carrierOnly) {
      for (const model_pid of live) compat.push({ accessory_pid: r['Module name'], model_pid, source: `legacy "Supported router models" = ${r['Supported router models']}` });
    }
    if (/^LTE Pluggable$|^UCS-E Series$/.test(r['Module name'])) {
      decide(ctx, FAMILY, 'Module name is a family label, not a PID', `${r['Module name']} (${source}) is a generic label. Needs the real orderable PID(s).`);
    }
  }
  decide(ctx, FAMILY, 'Module compatibility is derived', `router-modules.csv names supported routers by family or series ("C8200", "ISR1000"). Each name was resolved to exact router PIDs (exact PID, then exact series, then PIDs starting with "<name>-"), giving ${compat.length} pairs. Verify against datasheets before marking models ready. The audit's note that "C8200" also hit C8200-G2 routers is avoided because only exact series or "<name>-" prefixes match.`);

  return {
    models,
    accessories,
    compat,
    series: [...seriesNames].sort().map((s) => ({ ...seriesRow(FAMILY, s), scope: models.filter((m) => m.series === s).every((m) => m.scope === 'excluded') ? 'excluded' : 'in' })),
  };
}
