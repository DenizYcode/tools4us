# Phase 4: switching rows that stay draft (13 Oct 2026)

203 of 278 switching models are `ready`. The other 75 stay `draft` and are never published. Rows marked "not in the core set" were left out on purpose (decision of 13 Oct 2026); the others have a gap that the sources did not close. Nothing here was guessed.

## Gaps in rows that are in the core set

| Rows | Gap | What is needed |
| --- | --- | --- |
| C1200-8T-D | The datasheet lists no uplink ports for this desktop model | Decide how to show a switch without uplinks (for example `uplink_count: 0`) |
| C1300-12XS, C1300-16XTS, C1300-24XS, C1300-24XT, C1300-24XTS | All-10G models; the datasheet names no separate uplink ports | Decide how to show an all-10G aggregation switch |
| C9500-32QC, C9500-32C, C9500-48Y4C, C9500X-28C8D, C9500X-60L4D | Catalyst 9500 models other than C9500-24Y4C: no uplink value (the legacy data has none) | Datasheet pass for the 9500. C9500-32QC is also the replacement for the MS450 (kept as a note until it is published) |

## Not in the core set (no verified data yet)

- Catalyst 9400 (3 chassis), 9600 (1), 9610 SmartSwitch (1): modular chassis; need supervisor data. Audit #4 (C9400X-SUP-2 and -2XL are not in the data) is still open.
- Catalyst 9350 SmartSwitch (10) and 9550 SmartSwitch (3).
- Industrial Ethernet IE1000, IE3100, IE3200, IE3300, IE3400, IE9300 (39).
- Cisco Business 110 (7): unmanaged desktop switches without uplinks.

## Accessories

All 57 switching accessories (network modules, supervisors, line cards, stack kits) stay `draft`. The compatibility pairs were derived from the legacy series grouping and are not verified; the configuration builder (Phase 4, last step) only uses pairs verified against a datasheet.

## Audit items touched

- #20 (which PIDs really run in unified mode): not changed; `management` and `unified` are the legacy values.
- #22-#33, #59-#80 (stacking column against the feature list): the verified rows now carry one stacking value from the datasheet and the `stacking` feature follows it.
