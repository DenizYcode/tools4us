// Builds the search index for one language from the published catalog, stories and glossary. Pure: the caller passes
// the data and the link builders, so the build endpoint and the tests use the same code. Only published rows exist in
// the input, so a draft or excluded PID can never reach the index.

import { normalize, words } from './search.mjs';
import { replacementCards, textOf } from './cards.mjs';

// Words of the texts, plus the joined form of every hyphenated term, so "Wi-Fi" is also found as "wifi" and "SD-WAN" as "sdwan".
const joined = (text) => (String(text ?? '').match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g) ?? []).map((m) => normalize(m).replace(/ /g, ''));
const join = (...texts) => [...new Set(texts.flatMap((t) => [...words(t), ...joined(t)]))].join(' ');
const oneLine = (text, max = 160) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
};

/**
 * input: {
 *   lang, cards: { family: Card[] }, lookup: { family: Map<pid, Card> }, stories, glossary, labels,
 *   familyNames: { family: string }, pages: [{ id, title, text, href }],
 *   href: { model(family, slug), story(slug), term(key) }
 * }
 * `labels` is the i18n dictionary of the language (feature names come from `val.feature.*`). `familyTerms` is optional:
 * everyday words per family ("router", "switch", "wifi") that the Turkish texts do not contain.
 */
export function buildIndex({ lang, cards, lookup, stories, glossary, labels, familyNames, familyTerms = {}, pages = [], href }) {
  const out = [];

  for (const page of pages) {
    out.push({ id: `page:${page.id}`, kind: 'page', title: page.title, sub: oneLine(page.text), href: page.href, w: { name: join(page.title), series: '', text: join(page.text) } });
  }

  for (const [family, list] of Object.entries(cards)) {
    for (const card of list) {
      const featureNames = card.features.map((f) => labels[`val.feature.${f}`] ?? '');
      const summary = textOf(card, lang, 'summary');
      const replacements = replacementCards(card, lookup[family]).map((r) => ({ title: r.name, href: href.model(family, r.slug) }));
      out.push({
        id: `model:${family}:${card.slug}`,
        kind: 'model',
        family,
        title: card.name,
        sub: oneLine(summary),
        href: href.model(family, card.slug),
        pids: card.pids,
        lc: card.lifecycle,
        lo: card.last_order,
        repl: replacements,
        // End-of-Sale without a replacement PID: the note, or "Cisco lists none", is shown in place of a link.
        rn: textOf(card, lang, 'replacement_note'),
        rx: card.replacement_none === true,
        w: {
          name: join(card.name, ...card.pids),
          series: join(card.series),
          text: join(summary, textOf(card, lang, 'good_for'), ...featureNames, familyNames[family], familyTerms[family]),
        },
      });
    }
  }

  for (const story of stories) {
    out.push({
      id: `story:${story.id}`,
      kind: 'story',
      title: story.title[lang],
      sub: oneLine(story.teaser[lang]),
      href: href.story(story.slug[lang]),
      w: { name: join(story.title[lang]), series: '', text: join(story.teaser[lang]) },
    });
  }

  for (const [key, entry] of Object.entries(glossary)) {
    const item = entry[lang];
    out.push({
      id: `term:${key}`,
      kind: 'term',
      title: item.term,
      sub: oneLine(item.meaning),
      href: href.term(key),
      w: { name: join(item.term), series: '', text: join(item.meaning) },
    });
  }

  // Sanity: ids are unique, and the language the index is built for always has a title.
  const seen = new Set();
  for (const e of out) {
    if (seen.has(e.id)) throw new Error(`Search index: duplicate entry ${e.id}`);
    seen.add(e.id);
    if (!normalize(e.title)) throw new Error(`Search index: entry ${e.id} has no title (${lang})`);
  }
  return out;
}
