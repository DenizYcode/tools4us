// What the shortlist and request pages need to describe each published model, in one language. Loaded on those pages only.
import type { APIRoute } from 'astro';
import { locales, type Lang } from '../../i18n';
import { LAUNCH_FAMILIES, modelPath, type Family } from '../../i18n/routes';
import { FAMILY_DATA } from '../../lib/catalog';
import { buildShortlistData } from '../../lib/shortlist-data.mjs';

export function getStaticPaths() {
  return locales.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const data = buildShortlistData({
    lang,
    families: Object.fromEntries(LAUNCH_FAMILIES.map((f) => [f, FAMILY_DATA[f]])),
    href: (family: string, slug: string) => modelPath(lang, slug, family as Family),
  });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
