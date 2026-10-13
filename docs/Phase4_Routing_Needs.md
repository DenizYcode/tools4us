# Phase 4: routing rows that stay draft (13 Oct 2026)

98 of 114 in-scope routing models are `ready`. The other 16 stay `draft` and are never published. 51 ASR/NCS routers are `excluded` (carrier-grade, outside the audience). Nothing here was guessed.

## Gaps in rows that are in the core set

| Rows | Gap | What is needed |
| --- | --- | --- |
| C1131-8P, C1131X-8P | The C1131 End-of-Sale bulletin (EOL15945) lists only the Wi-Fi variants (C1131-8PW..), not these PIDs | Confirm the lifecycle of the base PIDs with Cisco |
| C8000V | Software router; throughput depends on instance size ("Compute Bound") | Decide how to show a throughput that depends on the VM size |
| C8111-G2-MX, C8121-G2-MX, C8121-CW-G2-MX, C8355-G2-MX, C8455-G2-MX | The Meraki datasheets for the -MX Catalyst 8000 models could not be read | Read them by hand and fill WAN ports, throughput and licence. They are also the replacements for MX67C (C8111-C-G2-MX) and MX68CW |
| Z4 | The Z4 datasheet text could not be extracted | Fill from the datasheet; Z4C was read and is ready |

## Not in the core set (no verified data yet)

- Industrial routers IR1101, IR8140H, IR8340, IR1833, IR1835 (7): no throughput in the legacy data.

## Accessories

All 15 in-scope routing accessories (PIM, SM and NIM modules) stay `draft`; two are labels, not PIDs (LTE Pluggable, UCS-E Series: audit #293/#294). The compatibility pairs were derived from series names and are not verified; the configuration builder only uses pairs verified against a datasheet.

## Audit items touched

- "Cellular Yes read as embedded" (24 rows): verified rows were corrected against the datasheets (see the corrections table); the rest are the draft rows above.
- #216-#218, #236, #238 (ISR 1100 throughput inconsistencies): the five End-of-Sale ISR1100 rows keep their legacy forwarding number and have no security number.
