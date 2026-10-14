// Launch gate: one command that answers every box of SPEC "Done when > Technical checks", plus the launch inputs
// that only the owner can fill, and lists the checks that no script can do (usability test, native Turkish review,
// KVKK text read by a lawyer) so none of them is forgotten.
//
//   PASS    proven now by a command or a direct check
//   FAIL    a check ran and failed: fix before launch
//   WARN    something to do before launch that does not break the site (owner input, old report)
//   SKIP    not run (--fast)
//   MANUAL  needs a person; the line says where to record it
//
// Usage: node scripts/check-launch.mjs [--fast] [--strict]
//   --fast    skip the two browser checks (Lighthouse, axe), which take a few minutes
//   --strict  go-live mode: WARN, SKIP and MANUAL also fail, so exit 0 means ready to launch
// Run `npm run build` first (it creates dist/ and src/data/generated/). Exit 1 on a FAIL.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { checkI18nParity } from './build-data/i18n-parity.mjs';
import { SITE_CONFIG, TO_FILL } from '../src/lib/site-config.mjs';
import { freshnessReport, VERIFIED_DAYS } from './freshness.mjs';

const args = process.argv.slice(2);
const fast = args.includes('--fast');
const strict = args.includes('--strict');
const today = new Date().toISOString().slice(0, 10);
const GEN = 'src/data/generated';

for (const need of ['dist/index.html', `${GEN}/stories.json`]) {
  if (!existsSync(need)) {
    console.error(`${need} is missing: run npm run build first`);
    process.exit(2);
  }
}

const read = (name) => JSON.parse(readFileSync(`${GEN}/${name}.json`, 'utf8'));
const run = (script, scriptArgs = []) => {
  const r = spawnSync(process.execPath, [...script, ...scriptArgs], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};
const lastLine = (out, re) => [...out.split('\n')].reverse().find((l) => re.test(l))?.trim() ?? out.trim().split('\n').pop();
const testCounts = (out) => ({ pass: Number(/ℹ pass (\d+)/.exec(out)?.[1] ?? 0), fail: Number(/ℹ fail (\d+)/.exec(out)?.[1] ?? 0) });

const results = [];
const add = (area, spec, status, detail) => results.push({ area, spec, status, detail });

// 1. Lighthouse and axe (browser checks).
if (fast) {
  add('Performance and accessibility', 'Mobile Lighthouse 90+ on hub, a family page and a story', 'SKIP', '--fast: run npm run check:lighthouse');
  add('Accessibility', 'WCAG 2.1 AA (axe, Tab focus) on every page type', 'SKIP', '--fast: run npm run check:a11y');
} else {
  const lh = run(['scripts/check-lighthouse.mjs'], ['--all']);
  add('Performance and accessibility', 'Mobile Lighthouse 90+ on hub, a family page and a story', lh.code === 0 ? 'PASS' : 'FAIL', lastLine(lh.out, /check:lighthouse/) + ' (18 page types)');
  const ax = run(['scripts/check-a11y.mjs']);
  add('Accessibility', 'WCAG 2.1 AA (axe, Tab focus) on every page type', ax.code === 0 ? 'PASS' : 'FAIL', lastLine(ax.out, /check:a11y/));
}

// 2. No End-of-Sale model from any selector: the exhaustive tests on the real catalog, and the built site.
{
  const t = run(['--test', '--test-name-pattern=only current models'], ['src/lib/family-logic.test.mjs', 'src/lib/wireless-logic.test.mjs']);
  const c = testCounts(t.out);
  const ok = t.code === 0 && c.pass >= 3 && c.fail === 0;
  add('Selectors', 'Zero End-of-Sale models returned by any selector', ok ? 'PASS' : 'FAIL', `${c.pass} exhaustive selector tests (wireless, switching, routing) passed, ${c.fail} failed${c.pass < 3 ? ' (fewer than 3 ran: the test names changed?)' : ''}`);
}

// 3. Turkish text everywhere.
{
  const problems = checkI18nParity('src/i18n/tr.json', 'src/i18n/en.json').map((e) => e.message);
  const models = ['wireless', 'switching', 'routing'].flatMap((f) => read(f).models.map((m) => ({ ...m, f })));
  const missing = [];
  for (const m of models) for (const field of ['name_tr', 'summary_tr', 'good_for_tr']) if (!String(m[field] ?? '').trim()) missing.push(`${m.pid}.${field}`);
  for (const f of ['wireless', 'switching', 'routing']) for (const s of read(f).series) if (!String(s.series_intro_tr ?? '').trim()) missing.push(`${f} series ${s.series}: series_intro_tr`);
  for (const [key, g] of Object.entries(read('glossary'))) if (!g.tr?.term?.trim() || !g.tr?.meaning?.trim()) missing.push(`glossary ${key}`);
  for (const s of read('stories').stories) for (const field of ['title', 'teaser', 'why', 'body']) if (!String(s[field]?.tr ?? '').trim()) missing.push(`story ${s.slug?.tr ?? s.id}.${field}`);
  const tr = JSON.parse(readFileSync('src/i18n/tr.json', 'utf8'));
  const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8'));
  const same = Object.keys(tr).filter((k) => tr[k] === en[k] && tr[k].trim().split(/\s+/).length >= 3 && !/^(val|badge|spec)\.|^notFound\.link/.test(k));
  const all = [...problems, ...missing];
  add('Turkish text', '100% of models and UI strings have Turkish text', all.length ? 'FAIL' : 'PASS', all.length ? `${all.length} gap(s), first: ${all.slice(0, 3).join('; ')}` : `${Object.keys(tr).length} UI strings, ${models.length} models, series, glossary and stories all have Turkish text${same.length ? `; ${same.length} string(s) are identical in TR and EN, check they are names: ${same.join(', ')}` : ''}`);
}

// 4. Internal links, disclaimer, no draft PID: the built-site check.
{
  const d = run(['scripts/check-dist.mjs']);
  add('Built site', 'Zero broken internal links; disclaimer on every page; no draft PID', d.code === 0 ? 'PASS' : 'FAIL', lastLine(d.out, /check:dist/) + ' / ' + lastLine(d.out, /internal links/));
}

// 4b. KVKK notice and disclaimer: every element still on the built pages (the legal reading is a manual check below).
{
  const k = run(['scripts/kvkk-check.mjs']);
  add('KVKK', 'KVKK notice and form consent carry every element; disclaimer on the page (TR and EN)', k.code === 0 ? 'PASS' : 'FAIL', k.code === 0 ? 'both notices have all 8 sections, name Web3Forms and GoatCounter, cite KVKK 5 and 11; required consent box links to the notice' : k.out.trim().split('\n').slice(0, 3).join('; '));
}

// 5. External link report: the last committed report (the network check runs weekly in CI, or `npm run check:links`).
{
  const path = 'docs/Phase7_External_Links.md';
  if (!existsSync(path)) add('External links', 'External link report reviewed', 'WARN', `no report yet: run npm run check:links -- --write=${path}`);
  else {
    const text = readFileSync(path, 'utf8');
    const date = /Checked (\d{4}-\d{2}-\d{2})/.exec(text)?.[1] ?? '';
    const age = date ? Math.floor((Date.parse(today) - Date.parse(date)) / 86400000) : 999;
    const bad = /(\d+) (broken|landing|unexpected)/g;
    const found = [...text.matchAll(bad)].map((m) => `${m[1]} ${m[2]}`);
    const unverified = /(\d+) unverified/.exec(text)?.[1];
    const summary = /addresses\. (.*)\./.exec(text)?.[1] ?? '';
    if (found.length) add('External links', 'External link report reviewed', 'FAIL', `report of ${date}: ${summary}; fix the addresses listed in ${path}`);
    else if (age > 14) add('External links', 'External link report reviewed', 'WARN', `report of ${date} is ${age} days old: run npm run check:links -- --write=${path}`);
    else add('External links', 'External link report reviewed', unverified ? 'WARN' : 'PASS', `report of ${date}: ${summary}${unverified ? '; open the unverified ones once in a browser' : ''}`);
  }
}

// 6. Featured stories: verified within 90 days and linked to a Cisco source.
{
  const stories = read('stories').stories;
  const models = ['wireless', 'switching', 'routing'].flatMap((f) => read(f).models);
  const report = freshnessReport({ stories, models, today });
  const featured = stories.filter((s) => s.featured);
  const noSource = featured.filter((s) => !(s.sources ?? []).some((x) => /^https:\/\/([a-z0-9-]+\.)*(cisco|meraki)\.com\//.test(x.url))).map((s) => s.slug?.en);
  const errors = [...report.errors, ...noSource.map((n) => `story "${n}" has no Cisco or Meraki source`)];
  add('Stories', `Every featured story verified within the last ${VERIFIED_DAYS} days and linked to a Cisco source`, errors.length ? 'FAIL' : report.warnings.length ? 'WARN' : 'PASS', errors.length ? errors.join('; ') : `${featured.length} featured stories, next review by ${report.facts.nextReview}${report.warnings.length ? `; ${report.warnings.join('; ')}` : ''}`);
}

// 7. Search.
{
  const t = run(['--test'], ['src/lib/search.test.mjs']);
  const c = testCounts(t.out);
  add('Search', 'Search finds models typed without Turkish characters and by old PIDs', t.code === 0 && c.pass >= 10 && c.fail === 0 ? 'PASS' : 'FAIL', `${c.pass} search tests passed, ${c.fail} failed (Turkish folding, typos, every published PID, old PID to replacement, no draft PID)`);
}

// 8. Owner inputs.
{
  const open = Object.entries(SITE_CONFIG.controller).filter(([, v]) => v === TO_FILL).map(([k]) => `controller.${k}`);
  add('Owner input', 'KVKK controller name and email filled in src/lib/site-config.mjs', open.length ? 'WARN' : 'PASS', open.length ? `still "TO FILL": ${open.join(', ')}` : 'filled');
}

// 9. What no script can do.
const manual = (area, spec, where) => {
  const done = existsSync(where) && /^Result:\s*PASS/m.test(readFileSync(where, 'utf8'));
  add(area, spec, done ? 'PASS' : 'MANUAL', done ? `recorded in ${where}` : `record the outcome in ${where} (a line "Result: PASS" once done)`);
};
manual('Usability test', 'Five Turkish users, four tasks on a phone, at least 4 of 5 pass every task', 'docs/Phase7_Usability_Results.md');
manual('Turkish review', 'Native review of all Turkish UI text, models, series, glossary and the first stories', 'docs/Phase7_Turkish_Review.md');
manual('KVKK', 'KVKK notice (TR and EN) read by a lawyer; Web3Forms and GoatCounter processing abroad named', 'docs/Phase7_KVKK_Review.md');
manual('Live services', 'After the first push: GoatCounter shows a page view, one real Web3Forms message arrives', 'docs/Phase7_Live_Checks.md');

// Report.
const mark = { PASS: 'PASS  ', FAIL: 'FAIL  ', WARN: 'WARN  ', SKIP: 'SKIP  ', MANUAL: 'MANUAL' };
console.log(`\nLaunch gate, ${today}${strict ? ' (strict)' : ''}\n`);
for (const r of results) console.log(`${mark[r.status]} ${r.spec}\n       ${r.detail}`);
const n = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${n('PASS')} pass, ${n('FAIL')} fail, ${n('WARN')} warn, ${n('SKIP')} skipped, ${n('MANUAL')} manual`);
const blocked = n('FAIL') > 0 || (strict && n('WARN') + n('SKIP') + n('MANUAL') > 0);
console.log(blocked ? (n('FAIL') ? 'NOT READY: fix the FAIL lines' : 'NOT READY: warnings and manual checks are open') : strict ? 'READY TO LAUNCH' : 'No failing check (run with --strict before go-live)');
process.exit(blocked ? 1 : 0);
