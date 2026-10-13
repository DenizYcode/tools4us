// The one filter rule for every family (SPEC "Old site review", Fix table): OR inside a group, AND across
// groups. "Must have" groups (`all`) require every selected value, so adding one narrows the result.
//
// A family describes its filters as a list of group definitions:
//   { id, kind: 'multi' | 'all' | 'single' | 'flag', test }
//   multi:  state[id] is a list of values; the card passes when any value passes test(card, value)
//   all:    state[id] is a list of values; the card passes when every value passes test(card, value)
//   single: state[id] is '' or one value (a radio group); test(card, value)
//   flag:   state[id] is a boolean; test(card)
// An empty group does not filter. `showOld` is built in: End-of-Sale models are hidden unless it is on.
// The state is plain data, so the page script, the tests and the result count use the same code.

export function emptyState(defs) {
  const state = { showOld: false };
  for (const d of defs) state[d.id] = d.kind === 'multi' || d.kind === 'all' ? [] : d.kind === 'flag' ? false : '';
  return state;
}

export function matchesWith(defs, card, state) {
  if (!state.showOld && card.lifecycle !== 'current') return false;
  for (const d of defs) {
    const v = state[d.id];
    switch (d.kind) {
      case 'multi':
        if (v.length && !v.some((x) => d.test(card, x))) return false;
        break;
      case 'all':
        if (v.length && !v.every((x) => d.test(card, x))) return false;
        break;
      case 'single':
        if (v && !d.test(card, v)) return false;
        break;
      case 'flag':
        if (v && !d.test(card)) return false;
        break;
    }
  }
  return true;
}

/** Number of active filter choices, for the chips and the "Clear all" button. */
export function activeCountWith(defs, state) {
  let n = state.showOld ? 1 : 0;
  for (const d of defs) {
    const v = state[d.id];
    n += d.kind === 'multi' || d.kind === 'all' ? v.length : v ? 1 : 0;
  }
  return n;
}

/** Reads a state from form data (anything with getAll, get and has, such as FormData). */
export function readState(defs, data) {
  const state = { showOld: data.has('showOld') };
  for (const d of defs) {
    state[d.id] = d.kind === 'multi' || d.kind === 'all' ? data.getAll(d.id).map(String) : d.kind === 'flag' ? data.has(d.id) : String(data.get(d.id) ?? '');
  }
  return state;
}
