// The old models the migration finder can find, with their replacements and what changes, in one language.
// Published End-of-Sale rows only. Loaded on the migration page only.
import type { APIRoute } from 'astro';
import { locales, tp, type Lang } from '../../i18n';
import { LAUNCH_FAMILIES, modelPath, comparePath, type Family } from '../../i18n/routes';
import { FAMILY_DATA } from '../../lib/catalog';
import { buildMigrationEntries } from '../../lib/migration.mjs';

export function getStaticPaths() {
  return locales.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const entries = buildMigrationEntries({
    lang,
    families: Object.fromEntries(LAUNCH_FAMILIES.map((f) => [f, FAMILY_DATA[f]])),
    vals: tp(lang, 'val.'),
    href: (family: string, slug: string) => modelPath(lang, slug, family as Family),
    compareHref: (family: string, slugs: string[]) => comparePath(lang, slugs, family as Family),
  });
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
};
