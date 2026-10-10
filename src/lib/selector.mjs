// Guided selector ("Bana model öner") for wireless. Pure function: answers in, 1-3 cards out, each with
// reason codes the page turns into a one-line "why" in the reader's language.
//
// Hard rules (SPEC, ui.md):
//  - only current models are ever returned, never End-of-Sale ones;
//  - the recommended model comes first when it fits;
//  - a model that needs more PoE than the reader's switch gives is not offered while a fully powered
//    one exists; when none exists, the closest are shown with an explicit PoE warning.
//
// answers: { env: 'indoor'|'outdoor', mgmt: 'on_prem'|'cloud'|'cisco_business'|'any',
//            poe: 'af'|'at'|'bt'|'unknown', density: 'low'|'medium'|'high', future: 'wifi7'|'sixghz'|'any' }

import { POE_RANK, isCurrent } from './wireless-model.mjs';

export const ANSWER_OPTIONS = {
  env: ['indoor', 'outdoor'],
  mgmt: ['any', 'on_prem', 'cloud', 'cisco_business'],
  poe: ['unknown', 'af', 'at', 'bt'],
  density: ['low', 'medium', 'high'],
  future: ['any', 'sixghz', 'wifi7'],
};

// Rough capacity classes from the spatial stream count. This is a rule of thumb, not a Cisco sizing figure,
// and the page says so in its assumptions.
const MIN_STREAMS = { low: 0, medium: 6, high: 10 };
const MAX_RESULTS = 3;

const GEN_RANK = { 7: 3, '6e': 2, 6: 1 };

function fits(card, a) {
  if (!isCurrent(card)) return false;
  if (!(card.environment === a.env || card.environment === 'indoor_outdoor')) return false;
  if (a.mgmt !== 'any' && !card.management.includes(a.mgmt)) return false;
  if (a.future === 'wifi7' && String(card.wifi_generation) !== '7') return false;
  if (a.future === 'sixghz' && !card.bands_ghz.includes(6)) return false;
  return true;
}

const needsMorePoe = (card, a) => a.poe !== 'unknown' && POE_RANK[card.poe_full] > POE_RANK[a.poe];

/** Returns { results: [{ card, why: string[], warnings: string[] }], relaxed: string[] }. */
export function recommend(cards, a) {
  const pool = cards.filter((c) => fits(c, a));
  const relaxed = [];

  // Capacity: prefer models with enough streams for the density; drop the preference when nothing is left.
  let sized = pool.filter((c) => (c.spatial_streams ?? 0) >= MIN_STREAMS[a.density]);
  if (sized.length === 0 && pool.length > 0) {
    sized = pool;
    relaxed.push('density');
  }

  let powered = sized.filter((c) => !needsMorePoe(c, a));
  if (powered.length === 0 && sized.length > 0) {
    powered = sized;
    relaxed.push('poe');
  }

  const score = (c) => {
    const surplus = (c.spatial_streams ?? 0) - MIN_STREAMS[a.density];
    // Prefer the smallest model that is big enough, so a small office is not sent to the biggest access point.
    const sizeFit = a.density === 'high' ? -surplus : surplus;
    // Recommended first, then the newest Wi-Fi generation, then the smallest model that is big enough.
    return [Number(c.recommended) * -1, -(GEN_RANK[c.wifi_generation] ?? 0), sizeFit, POE_RANK[c.poe_full], c.name];
  };
  const sorted = [...powered].sort((x, y) => {
    const sx = score(x);
    const sy = score(y);
    for (let i = 0; i < sx.length; i++) {
      if (sx[i] < sy[i]) return -1;
      if (sx[i] > sy[i]) return 1;
    }
    return 0;
  });

  // A recommended model leads even when its score is not the best (SPEC: "returns it first when it fits").
  const rec = sorted.find((c) => c.recommended);
  const ordered = rec ? [rec, ...sorted.filter((c) => c !== rec)] : sorted;

  const results = ordered.slice(0, MAX_RESULTS).map((card) => {
    const why = [];
    if (card.recommended) why.push('recommended');
    why.push(`env.${card.environment}`, `gen.${card.wifi_generation}`);
    if (a.mgmt !== 'any') why.push(`mgmt.${a.mgmt}`);
    else if (card.unified) why.push('mgmt.unified');
    if (a.poe !== 'unknown' && !needsMorePoe(card, a)) why.push(`poe.${card.poe_full}`);
    const warnings = [];
    if (needsMorePoe(card, a)) warnings.push(`poe-short.${card.poe_full}`);
    if (a.poe === 'unknown') warnings.push(`poe-needed.${card.poe_full}`);
    if (card.bands_ghz.includes(6)) warnings.push('six-ghz-turkey');
    return { card, why, warnings };
  });
  return { results, relaxed };
}
