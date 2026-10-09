# Tools4Us

Turkish-first, unofficial guide that helps Turkish Cisco partners pick current Cisco models and learn about new Cisco features. Static site on GitHub Pages. Owner and only editor: Denis.

The full spec is `docs/SPEC.md`. Before planning any task, read the SPEC.md sections that the task touches. If the spec and your assumptions disagree, the spec wins. If the spec is silent or contradicts itself, ask instead of guessing.

## Hard rules
- IMPORTANT: Never show, recommend or feature a model whose `lifecycle` is not `current` (End-of-Sale models appear only with a badge and a replacement link).
- No pricing, ordering, quoting, stock or lead-time features. Ever.
- Turkish is the default language. Every UI string exists in TR and EN. Write plain Turkish for non-technical readers; put the technical term in brackets.
- Content lives in `data/` and `content/`. Never hard-code models, specs or stories in components.
- Every spec value needs `source_url` and `last_verified`. Never invent a spec, date or PID; leave it empty and flag it.
- No Cisco logo, no Cisco or Ingram Micro branding, no assets/code/wording from ciscosizing.com. Footer disclaimer on every page.
- Mobile first: check every page at 375 px wide.

## Repo map
- `docs/SPEC.md`: product spec (source of truth). Launch scope: Switching, Wireless, Routing (Routing includes Meraki MX); other families are "Yakında".
- `docs/Phase1_Dataset_Audit.xlsx`: 348 known data issues with CSV row numbers and fixes
- `docs/old-site/`: the old SelectorTool code, for reference only. Port ideas, don't copy its filter logic (see SPEC "Old site review").
- `data/legacy/`: old CSVs, read-only input to the migration script. Never edit by hand.
- `data/catalog/`: new normalized data, one xlsx workbook per family, edited by hand (seeded in Phase 1)
- `scripts/build-data/`: validator, xlsx reader/writer, JSON emitter, one-time `migrate/`, audit closure, tests
- `docs/Phase1_Needs_Decision.md`, `docs/Phase1_Audit_Closure.md`: what the migration derived or left empty, and what is still open in the audit

## Commands
- `npm run dev`: dev server at http://localhost:4321/tools4us/ (the base path is part of every URL).
- `npm run check:data`: validate the catalog (`data/catalog/*.xlsx`) and the TR/EN i18n files against `.claude/rules/data.md` and the SPEC build checks. Prints a ready/draft/excluded summary; exits 1 on any error. Must pass before any commit.
- `npm run build:data`: `check:data`, then write the published rows (ready + in scope only) to `src/data/generated/*.json` plus `manifest.json` (sha256 per file). The folder is gitignored.
- `npm run check:design`: WCAG contrast check of every colour pair in `src/styles/tokens.css`; fails below 4.5:1 (3:1 for large text and UI edges).
- `npm run check:dist`: checks the built `dist/` (no dev gallery, disclaimer footer on every page, every internal link carries the base path, no third-party requests, no model PIDs). Run after `astro build`.
- `npm run build`: `check:design`, `build:data`, `astro build`, `check:dist`, then `pagefind --site dist`. Output in `dist/`. This is what CI runs.
- `npm run test:data`: node:test suite for the validator, the migration invariants against the real workbooks, the audit closure and the graphics layout maths.
- `npm run migrate:legacy`: one-time seed of `data/catalog/` from `data/legacy/`. Refuses to overwrite existing workbooks (they are edited by hand now); `-- --force` regenerates them and discards manual edits.
- `npm run audit:closure`: regenerate `docs/Phase1_Audit_Closure.md` and `.csv` from the audit workbook and the catalog.
- `npm run preview`: serve the built `dist/` locally, as Pages will. Run `npm run build` first.
- Dev-only graphics gallery: with `npm run dev`, open `/<base>/tr/dev-gallery/`. It does not exist in production builds.

## Workflow
- Work one phase at a time (SPEC "Build plan"). Start each phase in plan mode.
- Prove work with evidence: command output, build/check results, or a screenshot at 375 px and 1280 px.
- Commit after each working step with a clear message. Never push without asking.
- When a phase ends, update the "Status" section below: what is done, what is left, decisions made.
- When compacting, keep the current phase, the list of modified files and any failing checks.

## Status
- Phase 2: built; pushing at the new URL (see below for the verified result). Tools4Us shell: tokens + self-hosted Inter (check:design, 22 pairs pass), Header/Footer/Section/cards, hub (hero, 3 family cards, "Yakında" row for Data Center/Collaboration/Security, story and shortcut placeholders), 3 family stub pages x 2 languages with readable slugs and a language toggle that maps slugs, drawn graphics (FamilyGraphic, data-shaped DeviceGraphic, HeroGraphic; layout maths unit-tested; dev-only gallery). Verified at 375 px and 1280 px (script checks: no horizontal scroll, 16 px body, no tap target under 44 px, equal card heights, Tab order equals reading order at both widths), Turkish glyph test, visible focus ring (white on navy), `check:dist` (gallery absent, footer on all 10 pages, base paths, no third-party requests, no PIDs). Independent spec-reviewer run; its findings (phone focus order, port grid overflow into uplink cages, input clamping, dist guard, heading levels) are fixed and tested (`npm run test:data` 65/65). The first focus-order claim was only true on desktop; it is now true on phones too.
  - Decisions (10 Oct 2026): name Tools4Us; launch Switching, Wireless, Routing (Meraki MX in Routing); other families "Yakında"; drawn graphics; repo to be renamed `tools4us`. Deviations from SPEC: no search box until Phase 6 (a dead input would mislead); shortcuts and stories are inert placeholders.
  - Repo renamed to `tools4us` (owner, 10 Oct 2026); base path, package name, remote and docs updated. Turkish copy still needs native review.
- Phase 1: done (10 Oct 2026), pushed at `e1c9da9`; Actions run #3 green (build 18 s, deploy 11 s), live site unchanged (`/`, `/tr/`, `/en/` 200, unknown URL 404, no catalog files or model PIDs on the site). CI runs `npm run build`, so the real `check:data` now gates every deploy; `test:data` is not in CI. Next: Phase 2 (shell). Pipeline: `scripts/build-data/` (vocab, column specs, xlsx reader/writer, validator, emitter, `migrate/`, audit closure). Catalog: `data/catalog/{switching,wireless,routing,datacenter}.xlsx`, sheets models / accessories / compat / series. All rows are `draft`, so nothing is published yet; ASR/NCS routers (51) are `scope: excluded`. Evidence: `npm run test:data` 54/54, `npm run check:data` (2 warnings: two router module labels that are not PIDs) and `npm run build` pass, independent spec-reviewer run done and its data findings fixed, forced re-migration gives an identical content hash, and without `--force` it refuses.
  - Audit (`docs/Phase1_Audit_Closure.md`): 134 Fixed (each proven by a check), 120 Tracked (data we cannot invent; rows stay draft), 94 Open (mostly Low/Medium hygiene). Only High issue still open: #4 (C9400X-SUP-2/-2XL not in the legacy data). Decisions and derived values for you to confirm: `docs/Phase1_Needs_Decision.md`.
  - Decisions: xlsx; draft/ready status (checks fail only for ready rows); lifecycle `current|eos_announced|eos`, empty = unverified; announcement date optional; replacement as PIDs, note or `replacement_none`; legacy rows numbered like the audit (spreadsheet records). SPEC and `.claude/rules/data.md` updated first.
  - Left for later phases: Turkish text, `last_verified`, `source_url`, `added_date` and series explainers on every row (Wireless in Phase 3, the rest in Phase 4); lifecycle verification for the ~600 rows the audit did not cover; `recommended` picks; weekly external link check (Phase 7); `data/glossary.csv` (Phase 6).
- Phase 0: done (9 Oct 2026). Empty TR/EN shell went live at the original address (the site now lives at https://denizycode.github.io/tools4us/ since the 10 Oct 2026 rename). Verified live: `/` redirects to `/tr/`, `/tr/` and `/en/` return 200, unknown URL returns the 404 page, disclaimer footer on all four page types, no link missing the base path, no horizontal scroll at 375 px, 16 px body, 44 px toggle. Phase 1 follows.
  - Deploy history: the first run built fine but failed at deploy because Pages was not enabled for the repo; re-running after enabling it (Source: GitHub Actions) fixed it. The GitHub remote is now `https://github.com/DenizYcode/tools4us` (capital D, Y; renamed from cisco-partner-rehberi). Commits use the repo-local noreply identity.
  - Decisions: Astro 7 + Pagefind, plain CSS, Node 24; recorded in SPEC "Data model and editing". Site `https://denizycode.github.io/tools4us/`, base `/tools4us/`. `/tr/` default, `/en/`, root meta-refresh to `/tr/`.
  - Open for later: Turkish footer wording needs native review; Pagefind Turkish folding is untested (Phase 6).
  - Review follow-ups: Phase 6, add `data-pagefind-body` so the footer, 404 and redirect pages stay out of the search index. Decide before Phase 2 whether the disclaimer is also needed at the top of each page (SPEC old-site "Keep" says top and bottom; `ui.md` says footer).
