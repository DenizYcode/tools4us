// Comparison table rows for 2-4 model cards. Values stay raw (codes, numbers, lists): the page formats
// them in the reader's language. "Show only differences" hides rows where every model has the same value.

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;

// key, then how to read it from a card. Order is the order on screen.
export const ROWS = [
  ['lifecycle', (c) => c.lifecycle],
  ['wifi_generation', (c) => String(c.wifi_generation)],
  ['environment', (c) => c.environment],
  ['management', (c) => [...c.management].sort()],
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
  // The page passes a ready-made `licence` in the reader's language; full cards fall back to the Turkish text.
  ['licence', (c) => (c.licence !== undefined ? c.licence : c.text.tr.licence)],
];

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

export function buildRows(cards) {
  return ROWS.map(([key, read]) => {
    const values = cards.map(read);
    const first = JSON.stringify(values[0] ?? null);
    return { key, values, differs: values.some((v) => JSON.stringify(v ?? null) !== first) };
  });
}
