---
paths:
  - "data/**"
  - "content/**"
  - "scripts/**"
---

# Data rules

- Store values in normalized form, never as free text the UI must parse: numbers in base units (`uplink_gbps: [1, 10]`, `poe_budget_w: 370`), booleans for features, controlled vocabularies for categories (`management: [on_prem, cloud]`). Legacy wording lives in `legacy_*` columns and is never parsed.
- One PID per row. A row never holds two PIDs or a spare suffix ("-R/RS", "=").
- Module, line-card and antenna compatibility live in the `compat` sheet: exact PID to exact PID. No substring matching.
- Lifecycle fields: `lifecycle` (current | eos_announced | eos; empty = not verified, row stays `draft`), `eos_announced` (optional date), `last_order`, `ldos`, `replacement_pid`, `replacement_note`, `replacement_none`, `eol_bulletin_url`. A non-current model needs `last_order`, the bulletin URL and one of: a `replacement_pid` (each PID must be a ready, current model), a `replacement_note`, or `replacement_none`. A ready model's series must be ready too, and a ready row's PID must be a single orderable PID (letters, digits, `. _ + -`).
- Every row has `status` (draft | ready) and `scope` (in | excluded). Migrated rows start `draft`. Only `ready` + `in` rows are published and held to the rules below; `draft` rows are reported, `excluded` rows are skipped. Never mark a row `ready` to make a check pass.
- Required on every `ready` model: `pid`, `family`, `series`, `name_tr`, `summary_tr`, `good_for_tr`, `lifecycle`, `management`, `datasheet_url`, `source_url`, `last_verified`, `added_date`.
- At most one `recommended: true` per series, never on a non-current model, always with `recommended_why_tr`.
- Never invent a spec, date, PID or URL to fill a cell. Leave it empty, keep the row `draft`, and list it in the needs-data report.
- The data check script must fail the build on any rule above. Run it after every data change.
- `data/legacy/` is read-only. Fixes go into the migration script or the new data, never into legacy CSVs.
- The migration script seeds `data/catalog/` once. It refuses to overwrite existing workbooks without `--force`, because the owner edits them by hand afterwards.
- Known issues and their fixes: `docs/Phase1_Dataset_Audit.xlsx` (Issues tab). Close them by ID in commit messages, e.g. "fix audit #12".
