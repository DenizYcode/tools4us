// Builds the search index for one language from the published catalog, stories and glossary. Pure: the caller passes
// the data and the link builders, so the build endpoint and the tests use the same code. Only published rows exist in
// the input, so a draft or excluded PID can never reach the index.

import { normalize, words } from './search.mjs';
import { replacementCards, textOf } from './cards.mjs';

const join = (...texts) => [...new Set(texts.flatMap((t) => words(t)))].join(' ');
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
 * `labels` is the i18n dictionary of the language (feature names come from `val.feature.*`).
 */
export function buildIndex({ lang, cards, lookup, stories, glossary, labels, familyNames, pages = [], href }) {
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
        w: {
          name: join(card.name, ...card.pids),
          series: join(card.series),
          text: join(summary, textOf(card, lang, 'good_for'), ...featureNames, familyNames[family]),
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
