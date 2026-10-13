// Guided selector ("Bana model öner") for switching. Pure function: answers in, 1-3 cards out, each with
// reason codes the page turns into a one-line "why" in the reader's language.
//
// Hard rules (SPEC, ui.md):
//  - only current models are ever returned, never End-of-Sale ones;
//  - the recommended model comes first when it fits;
//  - a model whose PoE budget is below what the devices need is not offered while a model with enough
//    exists; when none exists, the closest are shown with an explicit PoE warning (SPEC content rule 2).
//
// answers: { ports: '8'|'16'|'24'|'48', poeCount: '0'|'8'|'16'|'24'|'48', poeWatts: '15'|'30'|'60',
//            mgmt: 'any'|'on_prem'|'cloud'|'cisco_business', uplink: 'any'|'10'|'25'|'100', extra: 'any'|'stacking'|'l3' }
//
// The PoE need is devices x watts per device, a rule of thumb (a phone takes about 7-15 W, a camera or access
// point 15-30 W, a Wi-Fi 7 access point up to 60 W); the page says so in its assumptions.

import { isCurrent } from './cards.mjs';

export const SWITCH_OPTIONS = {
  ports: ['8', '16', '24', '48'],
  poeCount: ['0', '8', '16', '24', '48'],
  poeWatts: ['15', '30', '60'],
  mgmt: ['any', 'on_prem', 'cloud', 'cisco_business'],
  uplink: ['any', '10', '25', '100'],
  extra: ['any', 'stacking', 'l3'],
};
export const SWITCH_DEFAULTS = { ports: '24', poeCount: '0', poeWatts: '30', mgmt: 'any', uplink: 'any', extra: 'any' };

const MAX_RESULTS = 3;
// PoE classes that can give at least this much per port.
const TYPE_WATTS = { poe: 15, poe_plus: 30, upoe: 60, upoe_plus: 90 };

const needW = (a) => Number(a.poeCount) * Number(a.poeWatts);

function fits(card, a) {
  if (!isCurrent(card)) return false;
  if ((card.port_count ?? 0) < Math.max(Number(a.ports), Number(a.poeCount))) return false;
  if (a.mgmt !== 'any' && !card.management.includes(a.mgmt)) return false;
  if (a.uplink !== 'any' && (card.uplink_max_gbps ?? 0) < Number(a.uplink)) return false;
  if (a.extra === 'stacking' && !card.stacking) return false;
  if (a.extra === 'l3' && card.layer3 !== 'basic_l3' && card.layer3 !== 'full_l3') return false;
  return true;
}

/** Does the PoE side hold: budget, and a PoE class that gives enough per port. */
function powers(card, a) {
  if (Number(a.poeCount) === 0) return true;
  return card.poe && (card.poe_budget_w ?? 0) >= needW(a) && (TYPE_WATTS[card.poe_type] ?? 0) >= Number(a.poeWatts);
}

/** Returns { results: [{ card, why: string[], warnings: string[] }], relaxed: string[] }. */
export function recommendSwitch(cards, a) {
  const pool = cards.filter((c) => fits(c, a));
  const relaxed = [];
  let powered = pool.filter((c) => powers(c, a));
  if (powered.length === 0 && pool.length > 0) {
    // Nothing has enough PoE: show the models with PoE, most budget first, and warn on each.
    powered = pool.filter((c) => c.poe).sort((x, y) => (y.poe_budget_w ?? 0) - (x.poe_budget_w ?? 0));
    if (powered.length > 0) relaxed.push('poe');
  }

  const wantPorts = Math.max(Number(a.ports), Number(a.poeCount));
  const score = (c) => [Number(c.recommended) * -1, c.port_count - wantPorts, (c.poe_budget_w ?? 0) - needW(a), c.name];
  const sorted = relaxed.includes('poe')
    ? powered // closest PoE first, already ordered
    : [...powered].sort((x, y) => {
        const sx = score(x);
        const sy = score(y);
        for (let i = 0; i < sx.length; i++) {
          if (sx[i] < sy[i]) return -1;
          if (sx[i] > sy[i]) return 1;
        }
        return 0;
      });

  // A recommended model leads when it fits (SPEC: "returns it first when it fits"); not when the PoE need was relaxed.
  const rec = relaxed.includes('poe') ? undefined : sorted.find((c) => c.recommended);
  const ranked = rec ? [rec, ...sorted.filter((c) => c !== rec)] : sorted;
  // A Meraki-mode (-M) model and its IOS XE twin are the same hardware: show the better-ranked one once.
  const seen = new Set();
  const ordered = ranked.filter((c) => {
    const hardware = c.name.replace(/-M$/, '');
    if (seen.has(hardware)) return false;
    seen.add(hardware);
    return true;
  });

  const results = ordered.slice(0, MAX_RESULTS).map((card) => {
    const why = [];
    if (card.recommended) why.push('recommended');
    why.push(`ports.${card.port_count}`);
    if (Number(a.poeCount) > 0 && powers(card, a)) why.push(`poe.${card.poe_budget_w}.${needW(a)}`);
    if (a.mgmt !== 'any') why.push(`mgmt.${a.mgmt}`);
    else if (card.unified) why.push('mgmt.unified');
    if (a.uplink !== 'any') why.push(`uplink.${card.uplink_max_gbps}`);
    if (a.extra === 'stacking') why.push('stacking');
    if (a.extra === 'l3') why.push('l3');
    const warnings = [];
    if (Number(a.poeCount) > 0 && !powers(card, a)) warnings.push(`poe-short.${card.poe_budget_w ?? 0}.${needW(a)}`);
    // The budget is the one with the default power supply: a second supply can raise it.
    if (card.poe && card.text.tr.poe_note) warnings.push(`poe-psu.${card.poe_budget_w}`);
    return { card, why, warnings };
  });
  return { results, relaxed };
}
