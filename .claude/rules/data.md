---
paths:
  - "data/**"
  - "content/**"
  - "scripts/**"
---

# Data rules

- Store values in normalized form, never as free text the UI must parse: numbers in base units (`uplink_gbps: [1, 10]`, `poe_budget_w: 370`), booleans for features, controlled vocabularies for categories (`management: [on_prem, cloud]`).
- One PID per row. A row never holds two PIDs or a spare suffix ("-R/RS", "=").
- Module, line-card and antenna compatibility live in a join table (`*_compat`): exact PID to exact PID. No substring matching.
- Lifecycle fields: `lifecycle` (current | eos_announced | eos), `eos_announced`, `last_order`, `ldos`, `replacement_pid`, `eol_bulletin_url`. A non-current model must have a replacement (or "none" with the bulletin URL).
- Required on every model: `pid`, `family`, `series`, `name_tr`, `summary_tr`, `lifecycle`, `datasheet_url`, `source_url`, `last_verified`, `added_date`.
- At most one `recommended: true` per series, never on a non-current model, always with `recommended_why_tr`.
- The data check script must fail the build on any rule above. Run it after every data change.
- `data/legacy/` is read-only. Fixes go into the migration script or the new data, never into legacy CSVs.
- Known issues and their fixes: `docs/Phase1_Dataset_Audit.xlsx` (Issues tab). Close them by ID in commit messages, e.g. "fix audit #12".
