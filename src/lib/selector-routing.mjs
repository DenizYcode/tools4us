// Guided selector ("Bana model öner") for routing. Pure function: answers in, 1-3 cards out, each with
// reason codes the page turns into a one-line "why" in the reader's language.
//
// Hard rules (SPEC, ui.md):
//  - only current models are ever returned, never End-of-Sale ones;
//  - the recommended model comes first when it fits;
//  - a model with less throughput than the reader needs is not offered while one with enough exists; when
//    none exists, the closest are shown with an explicit warning.
//
// answers: { size: '500'|'1000'|'5000'|'20000', wan: '1'|'2'|'4', mgmt: 'any'|'on_prem'|'cloud',
//            cellular: 'no'|'yes', sdwan: 'any'|'yes', where: 'device'|'virtual' }
//
// `size` is the internet/WAN speed the router must forward (Mbps). The router's forwarding throughput must reach it;
// encrypted and security speeds are lower and depend on a licence, so the result shows them as a warning.

import { isCurrent } from './cards.mjs';

export const ROUTER_OPTIONS = {
  size: ['500', '1000', '5000', '20000'],
  wan: ['1', '2', '4'],
  mgmt: ['any', 'on_prem', 'cloud'],
  cellular: ['no', 'yes'],
  sdwan: ['any', 'yes'],
  where: ['device', 'virtual'],
};
export const ROUTER_DEFAULTS = { size: '1000', wan: '1', mgmt: 'any', cellular: 'no', sdwan: 'any', where: 'device' };

const MAX_RESULTS = 3;

function fits(card, a) {
  if (!isCurrent(card)) return false;
  const virtual = card.form_factor.includes('virtual');
  if (a.where === 'virtual' ? !virtual : virtual) return false;
  if ((card.wan_port_count ?? 0) < Number(a.wan)) return false;
  if (a.mgmt !== 'any' && !card.management.includes(a.mgmt)) return false;
  if (a.cellular === 'yes' && card.cellular === 'none') return false;
  if (a.sdwan === 'yes' && !card.sd_wan) return false;
  return true;
}

const enough = (card, a) => (card.throughput_mbps ?? 0) >= Number(a.size);

/** Returns { results: [{ card, why: string[], warnings: string[] }], relaxed: string[] }. */
export function recommendRouter(cards, a) {
  const pool = cards.filter((c) => fits(c, a));
  const relaxed = [];
  let sized = pool.filter((c) => enough(c, a));
  if (sized.length === 0 && pool.length > 0) {
    sized = [...pool].sort((x, y) => (y.throughput_mbps ?? 0) - (x.throughput_mbps ?? 0));
    relaxed.push('size');
  }

  const sorted = relaxed.includes('size')
    ? sized
    : [...sized].sort((x, y) => {
        // Recommended first, then the smallest router that is big enough, so a small branch is not sent to a data-centre box.
        const sx = [Number(x.recommended) * -1, (x.throughput_mbps ?? 0) - Number(a.size), x.name];
        const sy = [Number(y.recommended) * -1, (y.throughput_mbps ?? 0) - Number(a.size), y.name];
        for (let i = 0; i < sx.length; i++) {
          if (sx[i] < sy[i]) return -1;
          if (sx[i] > sy[i]) return 1;
        }
        return 0;
      });

  // A recommended model leads even when its score is not the best (SPEC: "returns it first when it fits").
  const rec = relaxed.includes('size') ? undefined : sorted.find((c) => c.recommended);
  const ordered = rec ? [rec, ...sorted.filter((c) => c !== rec)] : sorted;

  const results = ordered.slice(0, MAX_RESULTS).map((card) => {
    const why = [];
    if (card.recommended) why.push('recommended');
    why.push(`thr.${card.throughput_mbps}`);
    why.push(`wan.${card.wan_port_count}`);
    if (a.mgmt !== 'any') why.push(`mgmt.${a.mgmt}`);
    else if (card.unified) why.push('mgmt.unified');
    if (a.cellular === 'yes') why.push(`cellular.${card.cellular}`);
    if (a.sdwan === 'yes') why.push('sdwan');
    if (a.where === 'virtual') why.push('virtual');
    const warnings = [];
    if (!enough(card, a)) warnings.push(`thr-short.${card.throughput_mbps ?? 0}.${a.size}`);
    // Encrypted and security speeds are what the router really delivers with VPN or the security features on.
    if (card.security_throughput_mbps) warnings.push(`security.${card.security_throughput_mbps}`);
    if (card.licence_required === true) warnings.push('licence');
    return { card, why, warnings };
  });
  return { results, relaxed };
}
