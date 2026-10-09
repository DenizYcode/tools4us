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
<!-- Fill in during Phase 0 once the stack is chosen, e.g.: -->
<!-- - `npm run dev`: local preview -->
<!-- - `npm run check:data`: validate data/ against the schema (must pass before any commit) -->
<!-- - `npm run build`: production build -->

## Workflow
- Work one phase at a time (SPEC "Build plan"). Start each phase in plan mode.
- Prove work with evidence: command output, build/check results, or a screenshot at 375 px and 1280 px.
- Commit after each working step with a clear message. Never push without asking.
- When a phase ends, update the "Status" section below: what is done, what is left, decisions made.
- When compacting, keep the current phase, the list of modified files and any failing checks.

## Status
- Phase 0: not started
