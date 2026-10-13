// Comparison table rows for 2-4 model cards. Values stay raw (codes, numbers, lists): the page formats
// them in the reader's language. "Show only differences" hides rows where every model has the same value.

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;

// key, then how to read it from a card. Order is the order on screen.
const common = {
  lifecycle: ['lifecycle', (c) => c.lifecycle],
  management: ['management', (c) => [...c.management].sort()],
  features: ['features', (c) => [...c.features].sort()],
  // The page passes a ready-made `licence` in the reader's language; full cards fall back to the Turkish text.
  last_order: ['last_order', (c) => c.last_order ?? null],
  replaced_by: ['replaced_by', (c) => c.replaced_by ?? []],
  licence: ['licence', (c) => (c.licence !== undefined ? c.licence : c.text.tr.licence)],
};
const tail = [common.last_order, common.replaced_by, common.licence];

export const ROWS = [
  common.lifecycle,
  ['wifi_generation', (c) => String(c.wifi_generation)],
  ['environment', (c) => c.environment],
  common.management,
  ['bands_ghz', (c) => c.bands_ghz],
  ['spatial_streams', (c) => c.spatial_streams],
  ['radio_config', (c) => c.radio_config],
  ['antenna_type', (c) => c.antenna_type],
  ['uplink_max_gbps', (c) => c.uplink_max_gbps],
  ['port_count', (c) => c.port_count],
  ['poe_full', (c) => c.poe_full],
  ['poe_supported', (c) => [...c.poe_supported].sort()],
  ['features', (c) => [...c.features].sort()],
  ['rugged', (c) => c.rugged],
  ['last_order', (c) => c.last_order ?? null],
  ['replaced_by', (c) => c.replaced_by ?? []],
  common.licence,
];

export const SWITCH_ROWS = [
  common.lifecycle,
  common.management,
  ['port_count', (c) => c.port_count],
  ['downlink_max_gbps', (c) => c.downlink_max_gbps],
  ['mgig', (c) => c.mgig],
  ['uplink_gbps', (c) => c.uplink_gbps],
  ['poe', (c) => c.poe],
  ['poe_type', (c) => c.poe_type],
  ['poe_budget_w', (c) => c.poe_budget_w],
  ['stacking', (c) => c.stacking],
  ['layer3', (c) => c.layer3],
  ['switch_form', (c) => c.switch_form],
  ...tail,
];

export const ROUTER_ROWS = [
  common.lifecycle,
  common.management,
  ['deployment', (c) => c.deployment],
  ['form_factor', (c) => [...c.form_factor].sort()],
  ['throughput_mbps', (c) => c.throughput_mbps],
  ['security_throughput_mbps', (c) => c.security_throughput_mbps],
  ['wan_port_count', (c) => c.wan_port_count],
  ['wan_port_max_gbps', (c) => c.wan_port_max_gbps],
  ['lan_port_count', (c) => c.lan_port_count],
  ['sd_wan', (c) => c.sd_wan],
  ['cellular', (c) => c.cellular],
  ['modules', (c) => c.modules],
  ['poe', (c) => c.poe],
  ['max_vpn_tunnels', (c) => c.max_vpn_tunnels],
  ...tail,
];

export const ROWS_BY_FAMILY = { wireless: ROWS, switching: SWITCH_ROWS, routing: ROUTER_ROWS };

// The card fields the rows of each family read. The compare page sends only these (plus slug, name, licence,
// last_order and replaced_by) for every published card.
export const COMPARE_FIELDS = {
  wireless: ['lifecycle', 'wifi_generation', 'environment', 'management', 'bands_ghz', 'spatial_streams', 'radio_config', 'antenna_type', 'uplink_max_gbps', 'port_count', 'poe_full', 'poe_supported', 'features', 'rugged'],
  switching: ['lifecycle', 'management', 'port_count', 'downlink_max_gbps', 'mgig', 'uplink_gbps', 'poe', 'poe_type', 'poe_budget_w', 'stacking', 'layer3', 'switch_form'],
  routing: ['lifecycle', 'management', 'deployment', 'form_factor', 'throughput_mbps', 'security_throughput_mbps', 'wan_port_count', 'wan_port_max_gbps', 'lan_port_count', 'sd_wan', 'cellular', 'modules', 'poe', 'max_vpn_tunnels'],
};

/** Parses ?m=a,b,c into at most MAX_COMPARE known slugs, in order, without duplicates. */
export function parseSelection(param, knownSlugs) {
  const known = new Set(knownSlugs);
  const out = [];
  for (const slug of String(param ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (known.has(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export function buildRows(cards, family = 'wireless') {
  return (ROWS_BY_FAMILY[family] ?? ROWS).map(([key, read]) => {
    const values = cards.map(read);
    const first = JSON.stringify(values[0] ?? null);
    return { key, values, differs: values.some((v) => JSON.stringify(v ?? null) !== first) };
  });
}
