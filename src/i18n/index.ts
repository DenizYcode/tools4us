import tr from './tr.json';
import en from './en.json';

export const locales = ['tr', 'en'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'tr';

export type Key = keyof typeof tr;

const dictionaries: Record<Lang, Record<Key, string>> = { tr, en };

export function t(lang: Lang, key: Key): string {
  return dictionaries[lang][key];
}

export function otherLang(lang: Lang): Lang {
  return lang === 'tr' ? 'en' : 'tr';
}

// Builds a site-internal URL that carries the GitHub Pages base path.
export function localePath(lang: Lang, path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\/+/, '');
  return `${base}/${lang}/${clean}`;
}
