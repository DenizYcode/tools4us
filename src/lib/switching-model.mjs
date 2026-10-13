// Switching model cards: the shared card builder plus the switch-specific fields and ordering.
// Switching rows are one PID per model, so every card holds one PID; the PoE budget is the budget with
// the default power supply (the note says what another supply gives).

import { buildCards, seriesBands } from './cards.mjs';

const SAME = ['series', 'lifecycle', 'last_order'];

const maxOf = (list) => (list?.length ? Math.max(...list) : null);

export function groupSwitchCards(models) {
  return buildCards(models, {
    same: SAME,
    extract: (first) => ({
      switch_form: first.switch_form ?? null,
      port_count: first.port_count ?? null,
      downlink_gbps: first.downlink_gbps ?? [],
      downlink_max_gbps: maxOf(first.downlink_gbps),
      uplink_gbps: first.uplink_gbps ?? [],
      uplink_max_gbps: maxOf(first.uplink_gbps),
      uplink_count: first.uplink_count ?? null,
      modular_uplinks: first.modular_uplinks === true,
      poe: first.poe === true,
      poe_type: first.poe_type ?? null,
      poe_budget_w: first.poe_budget_w ?? null,
      stacking: first.stacking === true,
      layer3: first.layer3 ?? null,
      mgig: first.mgig === true,
    }),
  });
}

// Order of the series on the family page: Catalyst 1200/1300 (simple), Catalyst 9000, then Meraki, then Cisco Business,
// then the Meraki-mode Catalyst models. Series with only End-of-Sale models go last whatever their position here.
export const SWITCH_SERIES_ORDER = [
  'C1200', 'C1300', 'C1300X', 'CBS220',
  'C9200CX', 'C9200L', 'C9200', 'C9300L', 'C9300', 'C9300X', 'C9500',
  'MS130 COMPACT', 'MS130', 'MS130R', 'MS150',
  '9200L-M', '9300L-M', '9300-M', '9300X-M',
  'MS210', 'MS450',
];

export function bySeries(cards, seriesRows) {
  return seriesBands(cards, seriesRows, {
    order: SWITCH_SERIES_ORDER,
    cardOrder: (a, b) => (a.port_count ?? 0) - (b.port_count ?? 0) || (a.poe_budget_w ?? 0) - (b.poe_budget_w ?? 0) || a.name.localeCompare(b.name),
  });
}
