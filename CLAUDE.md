# Cisco Partner Rehberi

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
- `docs/SPEC.md`: product spec (source of truth)
- `docs/Phase1_Dataset_Audit.xlsx`: 348 known data issues with CSV row numbers and fixes
- `docs/old-site/`: the old SelectorTool code, for reference only. Port ideas, don't copy its filter logic (see SPEC "Old site review").
- `data/legacy/`: old CSVs, read-only input to the migration script. Never edit by hand.
- `data/catalog/`: new normalized data (created in Phase 1)

## Commands
- `npm run dev`: dev server at http://localhost:4321/cisco-partner-rehberi/ (the base path is part of every URL).
- `npm run check:data`: validate data against the rules in `.claude/rules/data.md`; must pass before any commit. A stub until Phase 1.
- `npm run build`: `check:data`, then `astro build`, then `pagefind --site dist`. Output in `dist/`. This is what CI runs.
- `npm run preview`: serve the built `dist/` locally, as Pages will. Run `npm run build` first.

## Workflow
- Work one phase at a time (SPEC "Build plan"). Start each phase in plan mode.
- Prove work with evidence: command output, build/check results, or a screenshot at 375 px and 1280 px.
- Commit after each working step with a clear message. Never push without asking.
- When a phase ends, update the "Status" section below: what is done, what is left, decisions made.
- When compacting, keep the current phase, the list of modified files and any failing checks.

## Status
- Phase 0: in progress. Built and checked locally (build passes; TR/EN shell, root redirect, 404 and footer disclaimer verified in `dist/` and in the browser pane). Left: push to `origin/main` (needs approval), confirm the Actions run and the live site.
  - Decisions: Astro 7 + Pagefind, plain CSS, Node 24; recorded in SPEC "Data model and editing". Site `https://denizycode.github.io/cisco-partner-rehberi/`, base `/cisco-partner-rehberi/`. `/tr/` default, `/en/`, root meta-refresh to `/tr/`.
  - Open for later: Turkish footer wording needs native review; Pagefind Turkish folding is untested (Phase 6); `scripts/build-data` (SPEC layout) arrives in Phase 1 next to the `check-data.mjs` stub.
