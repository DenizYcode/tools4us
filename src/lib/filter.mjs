// Filter logic for the family page. One rule everywhere (SPEC "Old site review", Fix table):
// OR inside a group, AND across groups. "Must have" features are their own group where every
// selected feature is required, so adding a feature narrows the result.
//
// A filter state is plain data, so the page script, the tests and the result count use the same code:
//   { mgmt: string[], gen: string[], env: string[], poeMax: '' | 'af' | 'at' | 'bt',
//     sixGhz: boolean, mgig: boolean, features: string[], showOld: boolean }
// An empty group does not filter.

import { POE_RANK } from './wireless-model.mjs';

export const EMPTY_FILTERS = Object.freeze({ mgmt: [], gen: [], env: [], poeMax: '', sixGhz: false, mgig: false, features: [], showOld: false });

const MGMT_MATCH = {
  on_prem: (c) => c.management.includes('on_prem'),
  cloud: (c) => c.management.includes('cloud'),
  unified: (c) => c.unified,
  cisco_business: (c) => c.management.includes('cisco_business'),
};

export function matches(card, f) {
  if (!f.showOld && card.lifecycle !== 'current') return false;
  if (f.mgmt.length && !f.mgmt.some((m) => MGMT_MATCH[m]?.(card))) return false;
  if (f.gen.length && !f.gen.includes(String(card.wifi_generation))) return false;
  // An indoor+outdoor model fits both choices.
  if (f.env.length && !f.env.some((e) => card.environment === e || card.environment === 'indoor_outdoor')) return false;
  // "My switch gives at most X": the model must reach full function on X or less.
  if (f.poeMax && POE_RANK[card.poe_full] > POE_RANK[f.poeMax]) return false;
  if (f.sixGhz && !card.bands_ghz.includes(6)) return false;
  if (f.mgig && !(card.uplink_max_gbps >= 2.5)) return false;
  if (f.features.length && !f.features.every((x) => card.features.includes(x))) return false;
  return true;
}

export function applyFilters(cards, f) {
  return cards.filter((c) => matches(c, f));
}

/** Number of active filter choices, for the chips and the "Clear all" button. */
export function activeCount(f) {
  return f.mgmt.length + f.gen.length + f.env.length + (f.poeMax ? 1 : 0) + (f.sixGhz ? 1 : 0) + (f.mgig ? 1 : 0) + f.features.length + (f.showOld ? 1 : 0);
}
