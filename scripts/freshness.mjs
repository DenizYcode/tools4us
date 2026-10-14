// Freshness report for the weekly CI run and `check:launch` (SPEC "Risks": stale catalog or stories is the biggest risk;
// "Done when": every featured story verified within the last 90 days). The build already fails on a featured story past
// its `review_by`; this warns before that happens and reports old catalog rows, so the monthly review slot has a list.
//
// Usage: node scripts/freshness.mjs [--today=YYYY-MM-DD] [--warn-days=21] [--stale-days=180]
// Reads src/data/generated/*.json (run `npm run build:data` first). Exit 1 on an error, warnings never fail.
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const VERIFIED_DAYS = 90;

const dayNumber = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);
export const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);

/**
 * @param {{ stories: Array<Record<string, any>>, models: Array<{ pid: string, last_verified?: string }>, today: string, warnDays?: number, staleDays?: number }} input
 * @returns {{ errors: string[], warnings: string[], facts: Record<string, number | string | null> }}
 */
export function freshnessReport({ stories, models, today, warnDays = 21, staleDays = 180 }) {
  const errors = [];
  const warnings = [];
  const name = (s) => (typeof s.slug === 'object' ? s.slug.en ?? s.slug.tr : s.slug);
  let featured = 0;
  let nextReview = null;
  for (const s of stories) {
    const left = daysBetween(today, s.review_by);
    if (s.featured) {
      featured += 1;
      if (nextReview === null || s.review_by < nextReview) nextReview = s.review_by;
      const age = daysBetween(s.last_verified, today);
      // Past review_by is reported once below; the age error only matters while review_by still looks fine.
      if (age > VERIFIED_DAYS && left >= 0) errors.push(`featured story "${name(s)}" was verified ${age} days ago (limit ${VERIFIED_DAYS}): re-verify it against its sources`);
      if (left < 0) errors.push(`featured story "${name(s)}" is ${-left} days past review_by ${s.review_by}: re-verify it or set featured: false (the build fails until then)`);
      else if (left <= warnDays) warnings.push(`featured story "${name(s)}" must be re-verified by ${s.review_by} (${left} days left)`);
    } else if (left < 0) {
      warnings.push(`story "${name(s)}" is ${-left} days past review_by ${s.review_by}`);
    }
  }
  const old = models.filter((m) => m.last_verified && daysBetween(m.last_verified, today) > staleDays);
  if (old.length) {
    const oldest = old.reduce((a, b) => (a.last_verified < b.last_verified ? a : b));
    warnings.push(`${old.length} published model(s) were last verified more than ${staleDays} days ago (oldest: ${oldest.pid}, ${oldest.last_verified}): use the monthly review slot`);
  }
  const missing = models.filter((m) => !m.last_verified);
  if (missing.length) errors.push(`${missing.length} published model(s) have no last_verified date (first: ${missing[0].pid})`);
  const dates = models.map((m) => m.last_verified).filter(Boolean).sort();
  return { errors, warnings, facts: { featured, nextReview, models: models.length, oldestModelVerified: dates[0] ?? null } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (n) => (args.find((a) => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3);
  const today = flag('today') || new Date().toISOString().slice(0, 10);
  const dir = 'src/data/generated';
  if (!existsSync(`${dir}/stories.json`)) {
    console.error('src/data/generated is missing: run npm run build:data first');
    process.exit(2);
  }
  const stories = JSON.parse(readFileSync(`${dir}/stories.json`, 'utf8')).stories;
  const models = ['wireless', 'switching', 'routing'].flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}.json`, 'utf8')).models);
  const { errors, warnings, facts } = freshnessReport({ stories, models, today, warnDays: Number(flag('warn-days') || 21), staleDays: Number(flag('stale-days') || 180) });
  const ci = process.env.GITHUB_ACTIONS === 'true';
  const lines = [`## Freshness (${today})`, '', `${facts.models} published models, oldest verified ${facts.oldestModelVerified}; ${facts.featured} featured stories, next review by ${facts.nextReview ?? 'none'}.`, ''];
  for (const e of errors) lines.push(`- ERROR: ${e}`);
  for (const w of warnings) lines.push(`- warning: ${w}`);
  if (!errors.length && !warnings.length) lines.push('Nothing is due.');
  console.log(lines.join('\n'));
  if (ci) {
    for (const e of errors) console.log(`::error title=Freshness::${e}`);
    for (const w of warnings) console.log(`::warning title=Freshness::${w}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n\n');
  process.exit(errors.length ? 1 : 0);
}
