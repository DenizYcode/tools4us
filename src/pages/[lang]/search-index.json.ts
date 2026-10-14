// The search index of one language, built from the published catalog, stories and glossary. The search page loads it
// on demand; no other page does. Only published rows exist in these sources, so a draft PID cannot appear.
import type { APIRoute } from 'astro';
import { locales, tp, td, type Lang } from '../../i18n';
import { LAUNCH_FAMILIES, familyPath, modelPath, storyPath, glossaryPath, comparePath, storiesPath, shortlistPath, type Family } from '../../i18n/routes';
import { FAMILY_DATA } from '../../lib/catalog';
import { STORIES } from '../../lib/stories';
import glossary from '../../data/generated/glossary.json';
import { buildIndex } from '../../lib/search-index.mjs';

export function getStaticPaths() {
  return locales.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const cards = Object.fromEntries(LAUNCH_FAMILIES.map((f) => [f, FAMILY_DATA[f].cards])) as Record<Family, (typeof FAMILY_DATA)[Family]['cards']>;
  const lookup = Object.fromEntries(LAUNCH_FAMILIES.map((f) => [f, FAMILY_DATA[f].lookup])) as Record<Family, (typeof FAMILY_DATA)[Family]['lookup']>;
  const familyNames = Object.fromEntries(LAUNCH_FAMILIES.map((f) => [f, td(lang, `family.${f}.name`)])) as Record<Family, string>;

  const pages = [
    ...LAUNCH_FAMILIES.map((f) => ({ id: f, title: td(lang, `family.${f}.name`), text: td(lang, `family.${f}.blurb`), href: familyPath(lang, f) })),
    { id: 'stories', title: td(lang, 'stories.title'), text: td(lang, 'stories.lead'), href: storiesPath(lang) },
    { id: 'compare', title: td(lang, 'compare.title'), text: td(lang, 'compare.lead'), href: comparePath(lang) },
    { id: 'shortlist', title: td(lang, 'shortlist.title'), text: td(lang, 'shortlist.lead'), href: shortlistPath(lang) },
    { id: 'glossary', title: td(lang, 'glossary.title'), text: td(lang, 'glossary.lead'), href: glossaryPath(lang) },
  ];

  const index = buildIndex({
    lang,
    cards,
    lookup,
    stories: STORIES,
    glossary: glossary as Record<string, Record<Lang, { term: string; meaning: string }>>,
    labels: tp(lang, 'val.feature.'),
    familyNames,
    pages,
    href: {
      model: (family: string, slug: string) => modelPath(lang, slug, family as Family),
      story: (slug: string) => storyPath(lang, slug),
      term: (key: string) => glossaryPath(lang, key),
    },
  });
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } });
};
