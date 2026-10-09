import { join } from 'node:path';
import { readLegacyCsv } from './csv.mjs';
import { clean, yesNo, toInt, parseGbpsList } from './lib.mjs';
import { decide, recordFeatures, datasheet, modelBase, accessoryBase, seriesRow } from './common.mjs';

const FAMILY = 'wireless';

// Series are groupings the legacy data does not have; they follow Cisco's own model families.
const SERIES = [
  [/^CW917\d/, 'CW917x'],
  [/^CW916\d/, 'CW916x'],
  [/^C9136/, 'C9136'],
  [/^C9130/, 'C9130'],
  [/^C9124/, 'C9124'],
  [/^C9120/, 'C9120'],
  [/^C9115/, 'C9115'],
  [/^C9105/, 'C9105'],
  [/^IW9167/, 'IW9167'],
  [/^IW9165/, 'IW9165'],
  [/^CBW/, 'CBW'],
];

function seriesFor(pid, environment) {
  for (const [re, name] of SERIES) if (re.test(pid)) return name;
  if (/^MR\d/.test(pid)) return environment === 'outdoor' ? 'MR outdoor' : 'MR indoor';
  throw new Error(`No wireless series rule for ${pid}`);
}

function management(legacy) {
  switch (legacy) {
    case 'Unified':
      return ['on_prem', 'cloud'];
    case 'Catalyst':
    case 'Catalyst IW':
      return ['on_prem'];
    case 'Meraki':
      return ['cloud'];
    case 'Cisco Business':
      return ['cisco_business', 'embedded'];
    default:
      throw new Error(`Unknown wireless management "${legacy}"`);
  }
}

function environment(deviceType) {
  const t = deviceType.toLowerCase();
  if (t.startsWith('indoor/outdoor')) return 'indoor_outdoor';
  if (t.startsWith('indoor')) return 'indoor';
  if (t.startsWith('outdoor')) return 'outdoor';
  throw new Error(`Unknown wireless device type "${deviceType}"`);
}

function antennaType(text) {
  const t = text.toLowerCase();
  if (t.includes('optional kit')) return 'internal_optional_kit';
  if (t.includes('wall-plate')) return 'wall_plate';
  if (t.includes('omni')) return 'internal_omni';
  if (t.includes('directional')) return 'internal_directional';
  if (t === 'external') return 'external';
  if (t === 'internal') return 'internal';
  return null;
}

function bands(text) {
  return [...new Set((text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number))];
}

function poe(text) {
  const t = text.toLowerCase();
  if (t.startsWith('n/a')) return { supported: [], full: null, ac: true };
  if (t === 'at') return { supported: ['at'], full: 'at' };
  if (t === 'bt') return { supported: ['bt'], full: 'bt' };
  if (t === 'at/bt') return { supported: ['at', 'bt'], full: null, ambiguous: true };
  if (t === 'af/at') return { supported: ['af', 'at'], full: null, ambiguous: true };
  if (t === 'at (af reduced)') return { supported: ['af', 'at'], full: 'at' };
  return { supported: [], full: null, unknown: true };
}

function uplink(text) {
  const g = parseGbpsList(text);
  return { max: g.length ? Math.max(...g) : null, mgig: /mgig/i.test(text) ? true : g.length ? false : null };
}

export function migrateWireless(ctx, legacyDir) {
  const models = [];
  const accessories = [];
  const compat = [];
  const seriesNames = new Set();

  for (const r of readLegacyCsv(join(legacyDir, 'wireless-data.csv'))) {
    const source = `wireless-data.csv row ${r.__line}`;
    const env = environment(r['Device Type']);
    const skus = r.SKU.split(',').map((s) => s.trim()).filter(Boolean);
    const productName = clean(r.Model);
    const p = poe(r['PoE Class']);
    const up = uplink(r['Uplink Speed']);
    const ports = toInt(r.Ports);
    const rugged = r.Rugged ? r.Rugged.toLowerCase().startsWith('yes') : null;

    if (p.unknown) decide(ctx, FAMILY, 'PoE class not understood', `${source} (${r.SKU}): "${r['PoE Class']}"`);
    if (p.ambiguous) {
      decide(ctx, FAMILY, 'PoE for full function is not stated', `${r.SKU}: legacy says "${r['PoE Class']}". poe_supported lists both; poe_full is left empty for you to set from the datasheet.`);
    }
    if (up.max === null) decide(ctx, FAMILY, 'Uplink speed not numeric', `${r.SKU}: "${r['Uplink Speed']}" left empty.`);

    for (const sku of skus) {
      const series = seriesFor(sku, env);
      seriesNames.add(series);
      const variant = skus.length > 1 ? sku.slice(sku.indexOf('-') + 1) : null;
      models.push({
        ...modelBase({
          family: FAMILY,
          pid: sku,
          series,
          source,
          name: productName,
          management: management(r.Management),
          datasheetUrl: datasheet(ctx, FAMILY, source, r['Datasheet Link']),
          notes: [r.Notes, r['Ports notes']].filter(Boolean).join(' | '),
          features: r.Features,
        }),
        wifi_generation: r['Wi-Fi'].toLowerCase(),
        environment: env,
        wall_plate: /wall-plate/i.test(r['Device Type']),
        bands_ghz: bands(r['Bands (GHz)']),
        radio_config: clean(r['Radio Config']),
        spatial_streams: toInt(r['Spatial Streams']),
        antenna_type: antennaType(r['Antenna Type']),
        uplink_max_gbps: up.max,
        uplink_mgig: up.mgig,
        port_count: ports,
        poe_supported: p.supported,
        poe_full: p.full,
        ac_powered: p.ac ?? false,
        rugged,
        domain_code: yesNo(r['Domain Code']),
        sku_variant: variant,
        features: recordFeatures(ctx, FAMILY, r.Features),
        __legacyLifecycle: r['Lifecycle Status'],
      });
    }
    if (skus.length > 1) {
      decide(ctx, FAMILY, 'Rows split by SKU', `${r.SKU}: one legacy row became ${skus.length} rows (one PID each). Both keep the same specs; the suffix is stored in sku_variant.`);
    }
  }

  // Antennas and their compatibility.
  const apPids = models.map((m) => m.pid);
  const resolve = (token) => {
    if (apPids.includes(token)) return [token];
    if (apPids.includes(`C${token}`)) return [`C${token}`];
    return apPids.filter((pid) => pid.startsWith(`${token}-`));
  };

  const antennaByPid = new Map();
  const aliasesSeen = new Set();
  let lastAntenna = null;
  for (const r of readLegacyCsv(join(legacyDir, 'wireless-antenna-data.csv'))) {
    const source = `wireless-antenna-data.csv row ${r.__line}`;
    const raw = r['Antenna Model'];
    if (!raw) {
      // Continuation lines such as "Connectors: N-Male" describe the antenna above them.
      if (r.Description && lastAntenna) {
        lastAntenna.legacy_notes = [lastAntenna.legacy_notes, r.Description].filter(Boolean).join(' | ');
      }
      continue;
    }
    const slash = raw.match(/^(.*-)([A-Z]+)\/([A-Z]+)=?$/);
    // "-R/=" is a typo for the spare of a single PID: drop the stray slash and the "=".
    const pids = slash ? [`${slash[1]}${slash[2]}`, `${slash[1]}${slash[3]}`] : [raw.replace(/\/?=$/, '').replace(/\/$/, '')];
    if (slash || raw.endsWith('=') || raw.endsWith('/')) {
      decide(ctx, FAMILY, 'Antenna PID normalized', `${source}: "${raw}" -> ${pids.join(' and ')} (spare "=" removed, "/" variants split into one PID per row).`);
    }
    for (const pid of pids) {
      let acc = antennaByPid.get(pid);
      if (!acc) {
        acc = {
          ...accessoryBase({
            family: FAMILY,
            pid,
            kind: 'antenna',
            source,
            name: clean(r.Description) ?? pid,
            datasheetUrl: datasheet(ctx, FAMILY, source, r.Datasheet),
            description: r.Description,
            notes: r.Notes,
          }),
          port_count: toInt((r.Description.match(/(\d+)[- ]port/i) ?? [])[1]),
        };
        antennaByPid.set(pid, acc);
        accessories.push(acc);
      }
      lastAntenna = acc;
      const tokens = r['Compatible AP'].split(',').map((t) => t.trim()).filter(Boolean);
      if (!tokens.length) decide(ctx, FAMILY, 'Antenna without a compatible AP', `${source}: ${pid} has an empty "Compatible AP"; no compat rows created.`);
      for (const token of tokens) {
        const targets = resolve(token);
        if (!targets.length) {
          decide(ctx, FAMILY, 'Antenna compatibility not resolved', `${source}: "${token}" matches no AP PID; no compat row for ${pid}.`);
          continue;
        }
        if ((targets.length > 1 || targets[0] !== token) && !aliasesSeen.has(token)) {
          aliasesSeen.add(token);
          decide(ctx, FAMILY, 'Antenna compatibility alias resolved', `"${token}" -> ${targets.join(', ')} (matched by exact PID, a leading "C", or "<name>-" variants). Check against the datasheet.`);
        }
        for (const model_pid of targets) {
          if (!compat.some((c) => c.accessory_pid === pid && c.model_pid === model_pid)) {
            compat.push({ accessory_pid: pid, model_pid, source: `legacy "Compatible AP" = ${token}` });
          }
        }
      }
    }
  }

  return { models, accessories, compat, series: [...seriesNames].sort().map((s) => seriesRow(FAMILY, s)) };
}
