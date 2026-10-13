# Phase 4: switching verification (13 Oct 2026)

203 of 278 switching models went from `draft` to `ready`, each checked against a Cisco or Meraki datasheet or End-of-Sale bulletin on 2026-10-13 (`last_verified`). The values are applied by `scripts/build-data/fill/switching-pass1.mjs`. The Turkish and English text is generated from the verified specs with fixed templates, plus one hand-written explainer per series; it needs native review. Nothing was invented: where a source was silent the cell stays empty or the row stays draft (see `docs/Phase4_Switching_Needs.md`).

The legacy `datasheet_url` values pointed at series listing pages. They are replaced by the datasheet that was actually read (and `source_url` is the same page).

## How "current" was decided

Same method as Phase 3. A row is `current` when all three hold:

1. A cisco.com or documentation.meraki.com datasheet exists and carries no End-of-Sale notice.
2. The product's End-of-Sale/End-of-Life notice listing shows no hardware notice for it: the Catalyst 9200 and 9300 listings only name IOS XE releases, licences and an SSD; for Meraki, the model is not on [Meraki's End-of-Life policy page](https://documentation.meraki.com/General_Administration/Other_Topics/Product_End-of-Life_(EOL)_Policies) (MS130, MS150 and the -M Catalyst models are absent from it).
3. The model is not named in an End-of-Sale bulletin found by search.

This is weaker than a Cisco ordering check. Ask your Cisco contact to confirm "orderable" for the Catalyst 1200/1300 and Cisco Business 220 series: their datasheets do not carry a lifecycle statement, and the Catalyst 1200 listing page returned 404.

## Sources per series

| Series | Source read | Page date |
| --- | --- | --- |
| C1200 | [Catalyst 1200 data sheet](https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-1200-series-switches/nb-06-cat1200-ser-data-sheet-cte-en.html) | 7 Aug 2026 |
| C1300, C1300X | [Catalyst 1300 data sheet](https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-1300-series-switches/nb-06-cat1300-ser-data-sheet-cte-en.html) | 6 Aug 2026 |
| C9200, C9200L, C9200CX | [Catalyst 9200 data sheet](https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9200-series-switches/nb-06-cat9200-ser-data-sheet-cte-en.html) | 1 Sep 2026 |
| C9300, C9300L, C9300X | [Catalyst 9300 data sheet](https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9300-series-switches/nb-06-cat9300-ser-data-sheet-cte-en.html) | 23 Sep 2026 |
| 9200L-M | [Catalyst 9200L-M datasheet](https://documentation.meraki.com/Switching/Cloud_Management_with_IOS_XE/Product_Information/Overviews_and_Datasheets/Catalyst_9200L-M_Datasheet) | no date shown |
| 9300-M | [Catalyst 9300-M datasheet](https://documentation.meraki.com/MS/Product_Information/Overviews_and_Datasheets/Catalyst_9300-M_datasheet) | no date shown |
| 9300L-M | [Catalyst 9300L-M datasheet](https://documentation.meraki.com/Switching/Cloud_Management_with_IOS_XE/Product_Information/Overviews_and_Datasheets/Catalyst_9300L-M_Datasheet) | no date shown |
| 9300X-M | [Catalyst 9300X-M datasheet](https://documentation.meraki.com/Switching/Cloud_Management_with_IOS_XE/Product_Information/Overviews_and_Datasheets/Catalyst_9300X-M_Datasheet) | no date shown |
| MS130, MS130 COMPACT | [MS130 datasheet](https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS130_Datasheet) | no date shown |
| MS130R | [MS130R datasheet](https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS130R_Datasheet) | no date shown |
| MS150 | [MS150 datasheet](https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS150_Datasheet) and the [MS150 installation guide](https://documentation.meraki.com/Switching/MS_-_Switches/Install_and_Get_Started/Installation_Guides/MS150_Series_Installation_Guide) (per-model table) | no date shown |
| MS210 | [MS210 overview](https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS210_Overview_and_Specifications) | no date shown |
| MS450 | [MS450 installation guide](https://documentation.meraki.com/Switching/MS_-_Switches/Install_and_Get_Started/Installation_Guides/MS450_Series_Installation_Guide) | no date shown |
| C9500 | [Catalyst 9500 data sheet](https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9500-series-switches/nb-06-cat9500-ser-data-sheet-cte-en.html) | 6 Oct 2026 |
| CBS220 | [Business 220 data sheet](https://www.cisco.com/c/en/us/products/collateral/switches/business-220-series-smart-switches/datasheet-c78-744915.html) | 21 Mar 2025 |

Meraki documentation pages show a "Last updated" label without a value; the footer says 2026.

## End-of-Sale models

| Model | Lifecycle | Last order | Replacement named by the source | Catalog link | Source |
| --- | --- | --- | --- | --- | --- |
| MS210-24-HW | eos | 2026-04-30 | MS150-24T-4G | PID link | Meraki EoS announcement (30 Oct 2025) |
| MS210-24P-HW | eos | 2026-04-30 | MS150-24P-4G | PID link | same |
| MS210-48-HW | eos | 2026-04-30 | MS150-48T-4G | PID link | same |
| MS210-48LP-HW | eos | 2026-04-30 | MS150-48LP-4G | PID link | same |
| MS210-48FP-HW | eos | 2026-04-30 | MS150-48FP-4G | PID link | same |
| MS450-12-HW | eos_announced | 2026-10-29 | C9500-32QC | note only (not published yet) | [EOL15894](https://www.cisco.com/c/en/us/products/collateral/networking/switches/meraki-switches/meraki-ms450-12x40g-aggregation-switch-eol.html), announced 30 Apr 2026, last support 31 Oct 2031 |
| C9500-16X | eos | 2026-04-30 | C9500-24Y4C | PID link | [EOL15621](https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9500-series-switches/c9500-16x-switch-nm-c9500-nm-8x-nm-2q-eol.html), announced 30 Apr 2025, last support 30 Apr 2031 |
| C9500-16X-2Q | eos | 2026-04-30 | C9500-24Y4C | PID link | same (the bulletin names -A and -E) |

MS210 dates: announced 2025-10-30, end of support 2031-04-30. The replacements are the exact PIDs of the Meraki announcement PDF. C9500-24Y4C was verified in the 9500 datasheet and published so the link works.

## What the PoE budget means

`poe_budget_w` is the budget **with the default power supply** of that model. Catalyst 9200 and 9300 budgets depend on the supply you order, so `poe_note_*` gives the default supply and the maximum with two supplies (for example C9300-48P: 437 W with the default 715 W supply, 1152 W with two). The selector uses the default value, so it warns early rather than late. Meraki MS, Catalyst 1200/1300 and Cisco Business 220 have a fixed budget.

## Corrections to the legacy values

| Model | Legacy | Verified | Source |
| --- | --- | --- | --- |
| MS130-8X, -12X, -24X, -48X | no PoE | PoE+ (802.3at, 30 W per port), 120 / 240 / 370 / 740 W | MS130 datasheet |
| MS150 (all 12) | no stacking, L2 | physical stacking (2 x 80G ports), static routing (`basic_l3`) | MS150 datasheet |
| MS150-24MP-4X, -48MP-4X | mGig 2.5G, PoE+ | mGig ports are 5G; 60 W (802.3bt) on ports 17-24 / 33-48 only | MS150 datasheet and installation guide |
| Catalyst 1200 (16) and 1300/1300X (36) | `l2` | `basic_l3`: the datasheets call them Layer 3 switches with static routing (1300X adds OSPF) | C1200 and C1300 datasheets |
| 11 C1300 models with 1G uplinks (-2G, -4G) and C1300X-24MU/24NGU/48NGU | stacking yes | stacking no: they are not on the datasheet's stacking list | C1300 datasheet |
| All 38 -M Catalyst models | `full_l3` | `basic_l3`: static routing, OSPFv2 and PIM-SM are the listed Layer 3 features | -M datasheets |
| C9500-24Y4C | stacking yes, uplink 100G | StackWise Virtual only (no physical stacking), uplinks 40/100G | C9500 datasheet |
| 74 non-PoE switches | PoE empty | PoE no (stated, not guessed) | datasheets |

## Meaning of the -M suffix and the -E / -A suffix

- A PID ending in **-M** is the same Catalyst hardware managed from the Meraki dashboard (cloud); the Catalyst 9300 datasheet says switches can also be ordered in Meraki mode with the -M part numbers, and the Meraki datasheet says the Meraki dashboard is required. The non-M Catalyst 9200L/9300 models can be migrated to Meraki (`unified`, as in the legacy data).
- **-E / -A** on Catalyst 9200 PIDs is Network Essentials / Network Advantage (Catalyst 9200 datasheet, ordering tables). Some models are offered with one tier only.

## Judgement calls to review

- **Recommended models** (one per series, never End-of-Sale): C1200-24P-4G, C1300-24FP-4X, C1300X-24P-4X, C9200L-24P-4X, C9200-24P, C9200CX-12P-2X2G, C9300-48P, C9300L-24P-4X, C9300X-24HX, C9200L-24P-4X-M, C9300-24P-M, C9300L-24P-4X-M, C9300X-24HX-M, MS130-8P-HW, MS130-24P-HW, MS150-24P-4X, CBS220-24FP-4G, C9500-24Y4C. Confirm or change them in the workbook (`recommended`, `recommended_why_tr`).
- **PoE 370 W or 375 W:** the Catalyst 1300 datasheet shows 375 W in its PoE table and 370 W in its ordering table for C1300-24FP-4G/-4X and -48P-4G/-4X. The lower value is stored and the note says so. The Catalyst 1200 datasheet gives 375 W; older documents say 370 W.
- **Licence:** Catalyst 9000 and Meraki rows say "Lisans gerekir". Catalyst 1200, 1300 and Cisco Business 220 datasheets say nothing about a licence, so `licence_required` stays empty with a note to ask your partner.
- **Layer 3 wording:** the datasheets list features, not a "basic/full" label. `basic_l3` means static routing and basic dynamic routing; `full_l3` is kept from the legacy file for the IOS XE Catalyst 9000 models (Network Advantage adds the full routing set). The Catalyst 9200 and 9200CX values are the legacy ones; the datasheet only says routing depends on the Essentials or Advantage tier.
- **Management:** `management` and `unified` are unchanged from the legacy file (audit #20 stays open). The Catalyst 9200 datasheet also says 9200 switches can be migrated to Meraki, but the legacy data marks only the 9200L as both; not changed.
- **Table reading:** the Catalyst 9300 PoE table was read through a text summary; the default-power-supply column was checked against the Meraki -M datasheets, which repeat the same numbers (445, 437, 830, 822, 560, 490, 645, 735, 590, 690, 505, 890, 880, 675 W). Re-check the Catalyst 9300 numbers against the datasheet PDF before quoting a customer.
