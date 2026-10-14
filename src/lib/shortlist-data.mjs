// What the shortlist page needs to know about each published model card, keyed "family/slug". Built from published
// rows only, so a draft model can never be listed. `cfg` holds the configurations the builder can make for that card
// (verified module pairs): a shared link may only carry one of these, so a tampered link cannot print a made-up SKU.

import { replacementCards, textOf } from './cards.mjs';
import { optionsFor, slotLimit, buildSku } from './config-builder.mjs';

/**
 * input: { lang, families: { family: { cards, lookup, accessories, compat } }, href: (family, slug) => url }
 */
export function buildShortlistData({ lang, families, href }) {
  const out = {};
  for (const [family, data] of Object.entries(families)) {
    for (const card of data.cards) {
      const options = card.lifecycle === 'current' && slotLimit(card, 'network_module') > 0 ? optionsFor(card.pids[0], data.accessories, data.compat) : [];
      out[`${family}/${card.slug}`] = {
        n: card.name,
        se: card.series,
        p: card.pids,
        h: href(family, card.slug),
        lc: card.lifecycle,
        lo: card.last_order,
        r: replacementCards(card, data.lookup).map((r) => ({ n: r.name, h: href(family, r.slug) })),
        s: textOf(card, lang, 'summary'),
        // No replacement PID: the note (or "none") stands in for the replacement links.
        rn: textOf(card, lang, 'replacement_note'),
        rx: card.replacement_none === true,
        d: card.datasheet_url,
        cfg: options.map((o) => buildSku(card.pids[0], [o.pid])),
      };
    }
  }
  return out;
}
