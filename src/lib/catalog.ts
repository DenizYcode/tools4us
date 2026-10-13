// The published catalog as the pages see it. Reads src/data/generated/*.json, which `npm run build:data`
// writes from the ready rows only, so nothing here can show a draft or an unverified model.
import wireless from '../data/generated/wireless.json';
import switching from '../data/generated/switching.json';
import routing from '../data/generated/routing.json';
import glossaryData from '../data/generated/glossary.json';
import { groupCards, bySeries as wirelessBands, hasSixGhz } from './wireless-model.mjs';
import { groupSwitchCards, bySeries as switchBands } from './switching-model.mjs';
import { groupRouterCards, bySeries as routerBands } from './routing-model.mjs';
import { cardByPid, replacementCards, textOf, isCurrent } from './cards.mjs';
import type { Lang } from '../i18n';

export type Family = 'wireless' | 'switching' | 'routing';

/** One model card. Common fields are typed; the family-specific spec fields are read by name. */
export interface Card {
  family: Family;
  slug: string;
  name: string;
  series: string;
  pids: string[];
  variants: { pid: string; sku_variant: string | null; management: string[] }[];
  lifecycle: 'current' | 'eos_announced' | 'eos';
  eos_announced: string | null;
  last_order: string | null;
  ldos: string | null;
  replacement_pids: string[];
  replacement_note: string | null;
  replacement_none: boolean;
  eol_bulletin_url: string | null;
  features: string[];
  management: string[];
  unified: boolean;
  licence_required: boolean | null;
  recommended: boolean;
  text: Record<Lang, Record<string, string | null>>;
  datasheet_url: string;
  source_url: string;
  last_verified: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [spec: string]: any;
}

export interface SeriesBand {
  series: string;
  cards: Card[];
  hasCurrent: boolean;
  [row: string]: unknown;
}

interface FamilyData {
  cards: Card[];
  series: SeriesBand[];
  lookup: Map<string, Card>;
  verified: string;
  currentCount: number;
}

const newest = (models: { last_verified: string }[]) => models.map((m) => m.last_verified).sort().at(-1) ?? '';

function build(cards: Card[], series: SeriesBand[], models: { last_verified: string }[]): FamilyData {
  return { cards, series, lookup: cardByPid(cards), verified: newest(models), currentCount: cards.filter(isCurrent).length };
}

const wirelessCards = groupCards(wireless.models) as unknown as Card[];
const switchCards = groupSwitchCards(switching.models) as unknown as Card[];
const routerCards = groupRouterCards(routing.models) as unknown as Card[];

export const FAMILY_DATA: Record<Family, FamilyData> = {
  wireless: build(wirelessCards, wirelessBands(wirelessCards, wireless.series) as unknown as SeriesBand[], wireless.models),
  switching: build(switchCards, switchBands(switchCards, switching.series) as unknown as SeriesBand[], switching.models),
  routing: build(routerCards, routerBands(routerCards, routing.series) as unknown as SeriesBand[], routing.models),
};

export { replacementCards, textOf, isCurrent, hasSixGhz };

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
