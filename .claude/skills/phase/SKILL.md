---
name: phase
description: Start or resume a build phase of Tools4Us from the SPEC build plan
disable-model-invocation: true
argument-hint: "[phase-number] [notes or decisions]"
---

Start Phase $0 of the build plan.

Full arguments, including any notes or decisions from me after the phase number: $ARGUMENTS

1. Read `docs/SPEC.md`: the "Build plan" entry for Phase $0 and every section it depends on. Read the "Status" section of `CLAUDE.md`.
2. If this phase touches data, read the open High issues for the affected files in `docs/Phase1_Dataset_Audit.xlsx` (Issues tab).
3. Write a plan: goal, files to create or change, the checks that will prove it works (commands and screenshots), and anything in the spec that is unclear. Treat my notes as decisions already made. Ask me about the unclear points before coding.
4. After I approve, implement in small steps. Commit after each working step.
5. Finish by running the checks, showing the evidence, and updating the "Status" section of `CLAUDE.md` with what is done, what is left and any decisions made.
