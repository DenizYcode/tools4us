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
- `npm run dev`: dev server at http://localhost:4321/cisco-partner-rehberi/ (the base path is part of every URL).
- `npm run check:data`: validate the catalog (`data/catalog/*.xlsx`) and the TR/EN i18n files against `.claude/rules/data.md` and the SPEC build checks. Prints a ready/draft/excluded summary; exits 1 on any error. Must pass before any commit.
- `npm run build:data`: `check:data`, then write the published rows (ready + in scope only) to `src/data/generated/*.json` plus `manifest.json` (sha256 per file). The folder is gitignored.
- `npm run build`: `build:data`, then `astro build`, then `pagefind --site dist`. Output in `dist/`. This is what CI runs.
- `npm run test:data`: node:test suite for the validator, the migration invariants against the real workbooks, and the audit closure.
- `npm run migrate:legacy`: one-time seed of `data/catalog/` from `data/legacy/`. Refuses to overwrite existing workbooks (they are edited by hand now); `-- --force` regenerates them and discards manual edits.
- `npm run audit:closure`: regenerate `docs/Phase1_Audit_Closure.md` and `.csv` from the audit workbook and the catalog.
- `npm run preview`: serve the built `dist/` locally, as Pages will. Run `npm run build` first.

## Workflow
- Work one phase at a time (SPEC "Build plan"). Start each phase in plan mode.
- Prove work with evidence: command output, build/check results, or a screenshot at 375 px and 1280 px.
- Commit after each working step with a clear message. Never push without asking.
- When a phase ends, update the "Status" section below: what is done, what is left, decisions made.
- When compacting, keep the current phase, the list of modified files and any failing checks.

## Status
- Phase 1: done (10 Oct 2026), pushed at `e1c9da9`; Actions run #3 green (build 18 s, deploy 11 s), live site unchanged (`/`, `/tr/`, `/en/` 200, unknown URL 404, no catalog files or model PIDs on the site). CI runs `npm run build`, so the real `check:data` now gates every deploy; `test:data` is not in CI. Next: Phase 2 (shell). Pipeline: `scripts/build-data/` (vocab, column specs, xlsx reader/writer, validator, emitter, `migrate/`, audit closure). Catalog: `data/catalog/{switching,wireless,routing,datacenter}.xlsx`, sheets models / accessories / compat / series. All rows are `draft`, so nothing is published yet; ASR/NCS routers (51) are `scope: excluded`. Evidence: `npm run test:data` 54/54, `npm run check:data` (2 warnings: two router module labels that are not PIDs) and `npm run build` pass, independent spec-reviewer run done and its data findings fixed, forced re-migration gives an identical content hash, and without `--force` it refuses.
  - Audit (`docs/Phase1_Audit_Closure.md`): 134 Fixed (each proven by a check), 120 Tracked (data we cannot invent; rows stay draft), 94 Open (mostly Low/Medium hygiene). Only High issue still open: #4 (C9400X-SUP-2/-2XL not in the legacy data). Decisions and derived values for you to confirm: `docs/Phase1_Needs_Decision.md`.
  - Decisions: xlsx; draft/ready status (checks fail only for ready rows); lifecycle `current|eos_announced|eos`, empty = unverified; announcement date optional; replacement as PIDs, note or `replacement_none`; legacy rows numbered like the audit (spreadsheet records). SPEC and `.claude/rules/data.md` updated first.
  - Left for later phases: Turkish text, `last_verified`, `source_url`, `added_date` and series explainers on every row (Wireless in Phase 3, the rest in Phase 4); lifecycle verification for the ~600 rows the audit did not cover; `recommended` picks; weekly external link check (Phase 7); `data/glossary.csv` (Phase 6).
- Phase 0: done (9 Oct 2026). Empty TR/EN shell is live at https://denizycode.github.io/cisco-partner-rehberi/. Verified live: `/` redirects to `/tr/`, `/tr/` and `/en/` return 200, unknown URL returns the 404 page, disclaimer footer on all four page types, no link missing the base path, no horizontal scroll at 375 px, 16 px body, 44 px toggle. Phase 1 follows.
  - Deploy history: the first run built fine but failed at deploy because Pages was not enabled for the repo; re-running after enabling it (Source: GitHub Actions) fixed it. The GitHub remote is `https://github.com/DenizYcode/cisco-partner-rehberi` (capital D, Y). Commits use the repo-local noreply identity.
  - Decisions: Astro 7 + Pagefind, plain CSS, Node 24; recorded in SPEC "Data model and editing". Site `https://denizycode.github.io/cisco-partner-rehberi/`, base `/cisco-partner-rehberi/`. `/tr/` default, `/en/`, root meta-refresh to `/tr/`.
  - Open for later: Turkish footer wording needs native review; Pagefind Turkish folding is untested (Phase 6).
  - Review follow-ups: Phase 6, add `data-pagefind-body` so the footer, 404 and redirect pages stay out of the search index. Decide before Phase 2 whether the disclaimer is also needed at the top of each page (SPEC old-site "Keep" says top and bottom; `ui.md` says footer).
