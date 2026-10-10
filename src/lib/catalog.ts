// The published catalog as the pages see it. Reads src/data/generated/*.json, which `npm run build:data`
// writes from the ready rows only, so nothing here can show a draft or an unverified model.
import wireless from '../data/generated/wireless.json';
import glossaryData from '../data/generated/glossary.json';
import { groupCards, bySeries, cardByPid, replacementCards, textOf, isCurrent, hasSixGhz } from './wireless-model.mjs';
import type { Lang } from '../i18n';

export type Card = ReturnType<typeof groupCards>[number];
export type SeriesBand = ReturnType<typeof bySeries>[number];

export const wirelessCards: Card[] = groupCards(wireless.models);
export const wirelessSeries: SeriesBand[] = bySeries(wirelessCards, wireless.series);
export const wirelessLookup = cardByPid(wirelessCards);

export { replacementCards, textOf, isCurrent, hasSixGhz };

/** Newest verification date among published wireless rows (shown as "Son doğrulama"). */
export const wirelessVerified: string = wireless.models.map((m: { last_verified: string }) => m.last_verified).sort().at(-1) ?? '';

const glossary = glossaryData as Record<string, Record<Lang, { term: string; meaning: string }>>;

export function glossaryEntry(lang: Lang, key: string): { term: string; meaning: string } {
  const entry = glossary[key]?.[lang];
  if (!entry) throw new Error(`Glossary term "${key}" is missing (${lang})`);
  return entry;
}

/** Series explainer in a language (Turkish when the English text is empty). */
export function seriesIntro(band: SeriesBand, lang: Lang): string {
  const row = band as unknown as { series_intro_tr: string; series_intro_en?: string };
  return (lang === 'en' ? row.series_intro_en : undefined) ?? row.series_intro_tr;
}

/** Small public subset of every card for scripts (selector, compare). Public data only. */
export function publicCards(lang: Lang) {
  return wirelessCards.map((c) => ({ ...c, text: { tr: c.text.tr, en: c.text.en }, lang }));
}
