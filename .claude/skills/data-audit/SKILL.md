---
name: data-audit
description: Monthly lifecycle and data-quality check of the catalog; use when asked to review End-of-Sale status or refresh the catalog
disable-model-invocation: true
argument-hint: "[family or all]"
---

Run the monthly catalog check for: $ARGUMENTS

1. Run the data check script and report failures.
2. For each series in scope, search cisco.com (and documentation.meraki.com for Meraki) for End-of-Sale and End-of-Life announcements newer than the latest `last_verified` date. Open the bulletin itself; a search snippet is not a source.
3. For each newly announced model, propose: lifecycle, eos_announced, last_order, ldos, replacement_pid, eol_bulletin_url.
4. List models whose `last_order` date has passed so they move to "Eski modeller".
5. List current Cisco models in each series that are missing from the catalog, with the datasheet URL.
6. Show all proposed changes as a table for my approval. Don't edit data until I approve.
