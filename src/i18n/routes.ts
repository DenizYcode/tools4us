// Family pages and their readable URL slugs, defined once. Turkish and English slugs differ
// (/tr/anahtarlama/ and /en/switching/), so the language toggle needs to map between them.

import { localePath, otherLang, type Lang } from './index';

export const LAUNCH_FAMILIES = ['switching', 'wireless', 'routing'] as const;
export type Family = (typeof LAUNCH_FAMILIES)[number];

export const SLUGS: Record<Lang, Record<Family, string>> = {
  tr: { switching: 'anahtarlama', wireless: 'kablosuz', routing: 'yonlendirme' },
  en: { switching: 'switching', wireless: 'wireless', routing: 'routing' },
};

export function familySlug(lang: Lang, family: Family): string {
  return `${SLUGS[lang][family]}/`;
}

export function familyPath(lang: Lang, family: Family): string {
  return localePath(lang, familySlug(lang, family));
}

// Path (after /<lang>/) of the same family page in the other language.
export function familySwitchPath(lang: Lang, family: Family): string {
  return familySlug(otherLang(lang), family);
}

// Families still to be decided: shown as "coming soon" on the hub, with no pages.
export const LATER_FAMILIES = ['datacenter', 'collaboration', 'security'] as const;
export type LaterFamily = (typeof LATER_FAMILIES)[number];

// Tool pages and sub-pages of the wireless family. Slugs are readable in each language.
export const COMPARE_SLUG: Record<Lang, string> = { tr: 'karsilastir', en: 'compare' };
export const SELECTOR_SLUG: Record<Lang, string> = { tr: 'bana-model-oner', en: 'find-my-model' };

export const comparePath = (lang: Lang, selection: string[] = []): string =>
  localePath(lang, `${COMPARE_SLUG[lang]}/`) + (selection.length ? `?m=${selection.join(',')}` : '');

export const selectorPath = (lang: Lang, family: Family = 'wireless'): string => localePath(lang, `${SLUGS[lang][family]}/${SELECTOR_SLUG[lang]}/`);

export const modelPath = (lang: Lang, slug: string, family: Family = 'wireless'): string => localePath(lang, `${SLUGS[lang][family]}/${slug}/`);

// Paths (after /<lang>/) of the same page in the other language, for the language toggle.
export const compareSwitchPath = (lang: Lang): string => `${COMPARE_SLUG[otherLang(lang)]}/`;
export const selectorSwitchPath = (lang: Lang, family: Family = 'wireless'): string => `${SLUGS[otherLang(lang)][family]}/${SELECTOR_SLUG[otherLang(lang)]}/`;
export const modelSwitchPath = (lang: Lang, slug: string, family: Family = 'wireless'): string => `${SLUGS[otherLang(lang)][family]}/${slug}/`;
