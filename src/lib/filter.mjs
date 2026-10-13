// Filter logic for the wireless family page, on the shared engine (filter-engine.mjs): OR inside a group,
// AND across groups, "must have" features as their own group. The group definitions are in filters.mjs.
//
//   { mgmt: string[], gen: string[], env: string[], poeMax: '' | 'af' | 'at' | 'bt',
//     sixGhz: boolean, mgig: boolean, features: string[], showOld: boolean }

import { emptyState, matchesWith, activeCountWith } from './filter-engine.mjs';
import { WIRELESS_FILTERS } from './filters.mjs';

export const EMPTY_FILTERS = Object.freeze(emptyState(WIRELESS_FILTERS));

export const matches = (card, f) => matchesWith(WIRELESS_FILTERS, card, f);

export function applyFilters(cards, f) {
  return cards.filter((c) => matches(c, f));
}

/** Number of active filter choices, for the chips and the "Clear all" button. */
export const activeCount = (f) => activeCountWith(WIRELESS_FILTERS, f);
