// Migration finder ("Eski cihazım var"): an old model in, the current replacement out, with what changes. Only
// published End-of-Sale models can be found (draft PIDs never reach the site), and a replacement is always a ready,
// current model because the build check requires it. "What changes" is the compare table's own rows, kept where the
// two models differ, so the licence, power and management differences come from the same data as the compare page.

import { buildRows } from './compare.mjs';
import { formatValue } from './format.mjs';
import { replacementCards, textOf } from './cards.mjs';
import { words } from './search.mjs';

// Rows that describe the old model's state, not a difference between the two devices.
const NOT_A_CHANGE = new Set(['lifecycle', 'last_order', 'replaced_by']);

const prepared = (card, lang) => ({ ...card, licence: textOf(card, lang, 'licence') });

/** [{ key, from, to }] for the rows where the old and the new model differ, in the compare table's order. */
export function changesBetween(oldCard, newCard, family, lang, vals) {
  return buildRows([prepared(oldCard, lang), prepared(newCard, lang)], family)
    .filter((row) => row.differs && !NOT_A_CHANGE.has(row.key))
    .map((row) => ({ key: row.key, from: formatValue(row.key, row.values[0], vals, lang), to: formatValue(row.key, row.values[1], vals, lang) }));
}

/**
 * Entries for every published model that is not current, shaped for src/lib/search.mjs (title, pids, w) plus what the
 * page shows. input: { lang, families: { family: { cards, lookup } }, vals, href(family, slug), compareHref(family, [slugs]) }
 */
export function buildMigrationEntries({ lang, families, vals, href, compareHref }) {
  const out = [];
  for (const [family, data] of Object.entries(families)) {
    for (const card of data.cards) {
      if (card.lifecycle === 'current') continue;
      out.push({
        id: `${family}/${card.slug}`,
        kind: 'model',
        family,
        title: card.name,
        pids: card.pids,
        lc: card.lifecycle,
        lo: card.last_order,
        ldos: card.ldos,
        href: href(family, card.slug),
        bulletin: card.eol_bulletin_url,
        note: textOf(card, lang, 'replacement_note'),
        none: card.replacement_none,
        repls: replacementCards(card, data.lookup).map((r) => ({
          slug: r.slug,
          name: r.name,
          href: href(family, r.slug),
          summary: textOf(r, lang, 'summary'),
          compare: compareHref(family, [card.slug, r.slug]),
          changes: changesBetween(card, r, family, lang, vals),
        })),
        w: { name: [...new Set([...words(card.name), ...card.pids.flatMap((p) => words(p))])].join(' '), series: words(card.series).join(' '), text: '' },
      });
    }
  }
  return out;
}
