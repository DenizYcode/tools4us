// Wireless model cards: the shared card builder (cards.mjs) plus the wireless-specific fields and ordering.
// Variants of one model (CW9176I-CFG and -RTG, CW9166I and CW9166I-MR, IW9167EH-E-AP and -URWB) share a
// name_tr in the data. They must agree on everything that decides whether a card is shown or recommended.

import { buildCards, seriesBands } from './cards.mjs';

export { slugify, textOf, isCurrent, cardByPid, replacementCards } from './cards.mjs';

export const POE_RANK = { af: 1, at: 2, bt: 3 };

const SAME = ['series', 'lifecycle', 'environment', 'wifi_generation', 'poe_full', 'last_order'];

/** One card per model name. Throws when variants disagree on a field that must be shared. */
export function groupCards(models) {
  return buildCards(models, {
    same: SAME,
    extract: (first) => ({
      wifi_generation: first.wifi_generation,
      environment: first.environment,
      bands_ghz: first.bands_ghz ?? [],
      spatial_streams: first.spatial_streams ?? null,
      radio_config: first.radio_config ?? null,
      antenna_type: first.antenna_type ?? null,
      uplink_max_gbps: first.uplink_max_gbps ?? null,
      uplink_mgig: first.uplink_mgig === true,
      port_count: first.port_count ?? null,
      poe_supported: first.poe_supported ?? [],
      poe_full: first.poe_full,
      wall_plate: first.wall_plate === true,
      rugged: first.rugged === true,
    }),
  });
}

/** True when the 6 GHz band is part of the model: the Turkey note applies. */
export const hasSixGhz = (card) => card.bands_ghz.includes(6);

const GEN_RANK = { 7: 3, '6e': 2, 6: 1 };

/**
 * Series for the family page. Series with at least one current model come first (newest Wi-Fi generation, then
 * name); series that only hold End-of-Sale models are last. Inside a series: recommended, current, then older.
 */
export function bySeries(cards, seriesRows) {
  const gen = (s) => Math.max(0, ...s.cards.map((c) => GEN_RANK[c.wifi_generation] ?? 0));
  return seriesBands(cards, seriesRows, {
    cardOrder: (a, b) => (GEN_RANK[b.wifi_generation] ?? 0) - (GEN_RANK[a.wifi_generation] ?? 0) || a.name.localeCompare(b.name),
    seriesSort: (a, b) => gen(b) - gen(a) || a.series.localeCompare(b.series),
  }).map((s) => ({ ...s, gen: gen(s) }));
}
