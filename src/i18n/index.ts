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

/** Fills {name} placeholders: tf('tr', 'list.seriesCount', { n: 3 }). */
export function tf(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  return t(lang, key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

/** Text for a key built at run time (value labels such as val.poe.bt). A missing key fails the build, not the reader. */
export function td(lang: Lang, key: string): string {
  const value = (dictionaries[lang] as Record<string, string>)[key];
  if (value === undefined) throw new Error(`Missing i18n key "${key}" (${lang})`);
  return value;
}

/** Every string under a prefix, for pages whose scripts need their own text: tp('tr', 'filters.') */
export function tp(lang: Lang, prefix: string): Record<string, string> {
  return Object.fromEntries(Object.entries(dictionaries[lang] as Record<string, string>).filter(([key]) => key.startsWith(prefix)));
}
