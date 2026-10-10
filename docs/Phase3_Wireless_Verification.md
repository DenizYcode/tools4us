# Phase 3: wireless verification (10 Oct 2026)

Every wireless model that went from `draft` to `ready` was checked against a Cisco or Meraki source on 2026-10-10 (`last_verified`). The values are applied by `scripts/build-data/fill/wireless-pass1.mjs`. Turkish and English text is a draft written from these specs and needs your native review. Nothing was invented: where a source was silent the cell stays empty or the row stays draft (see `docs/Phase3_Wireless_Needs.md`).

## How "current" was decided

A datasheet alone does not prove a model is orderable. A row is `current` when all three hold:

1. A cisco.com or documentation.meraki.com datasheet exists and carries no End-of-Sale notice.
2. The product series page on cisco.com shows no End-of-Sale for it (Catalyst 9100 page: only the 9117AX is marked EOL; IW9167 and Business 100 pages: status "Available", no notice for these models), or, for Meraki, the model is not on Meraki's End-of-Life list.
3. The model is not named in a Cisco End-of-Sale bulletin found by search.

This is the best evidence reachable without a Cisco login. It is weaker than a Cisco ordering check: ask your Cisco contact to confirm "orderable" for the series flagged below.

## End-of-Sale models (real bulletin, not the old generic link)

Source: [EOL15855, End-of-Sale and End-of-Life Announcement for the Cisco and Meraki Wi-Fi 6 Indoor Access Points](https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9100ax-access-points/meraki-wi-fi-6-indoor-access-points-eol.html) (announced 2026-03-30, amended 2026-08-19). Milestones: End-of-Sale 2026-12-31, last ship 2027-03-31, last date of support 2031-12-31.

| Model | Lifecycle | Last order | Replacement in the bulletin | Catalog PIDs linked |
| --- | --- | --- | --- | --- |
| C9105AXI | eos_announced | 2026-12-31 | 9171I, 9172I | CW9171I and CW9172I (-CFG, -RTG) |
| C9105AXW | eos_announced | 2026-12-31 | 9172H | CW9172H (-CFG, -RTG) |
| C9115AXI | eos_announced | 2026-12-31 | 9174I | CW9174I (-CFG, -RTG) |
| C9115AXE | eos_announced | 2026-12-31 | 9174E | CW9174E (-CFG, -RTG) |
| C9120AXI | **eos** | **2026-07-31** (amended) | 9176I | CW9176I (-CFG, -RTG) |
| C9120AXE | **eos** | **2026-07-10** (amended) | 9174E | CW9174E (-CFG, -RTG) |
| C9120AXP | **eos** | **2026-07-10** (amended) | 9174E | CW9174E (-CFG, -RTG) |
| C9130AXI | eos_announced | 2026-12-31 | 9178I | CW9178I (-CFG, -RTG) |
| C9130AXE | eos_announced | 2026-12-31 | 9174E | CW9174E (-CFG, -RTG) |
| MR36 | eos_announced | 2026-12-31 | 9172I | CW9172I (-CFG, -RTG) |
| MR36H | eos_announced | 2026-12-31 | 9172H | CW9172H (-CFG, -RTG) |
| MR44 | eos_announced | 2026-12-31 | 9174I | CW9174I (-CFG, -RTG) |
| MR46 | eos_announced | 2026-12-31 | 9176I | CW9176I (-CFG, -RTG) |
| MR46E | eos_announced | 2026-12-31 | 9174E | CW9174E (-CFG, -RTG) |

The legacy data (and the audit) gave 2026-12-31 for all of them. The amended bulletin moved the three C9120 models earlier, and those dates have already passed, so they are `eos` and belong in the "Eski modeller" list. The announcement date is 2026-03-30 for all. Meraki's End-of-Life page lists the same MR dates ([Meraki product EOL policies](https://documentation.meraki.com/General_Administration/Other_Topics/Product_End-of-Life_(EOL)_Policies)). The bulletin states that MR28, MR76, MR78, MR86 and C9124AX are not part of this announcement.

## Meaning of the -CFG, -RTG, -MR and -x suffixes

Source: [Cisco Wireless Ordering Guide](https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9800-series-wireless-controllers/nb-06-wrles-dna-sub-lic-og-cte-en.html) (updated 2026-09-01).

- **-RTG** is "Ready to go – fastest shipment with default choices"; **-CFG** is "Configurable – customizable accessories and packaging". They are not regulatory or hardware differences. The Wi-Fi 7 datasheets describe one model per PID family.
- **Wi-Fi 7 and CW9179F are global-use** access points: no regulatory-domain code and no management-specific PID. Management is a software choice (on-premises or cloud).
- **CW9166, CW9164, CW9162, CW9163E**: "-x" is the regulatory domain; "-MR" is the Meraki cloud version. "For on-premises management -x part number should be ordered, for cloud use -MR." So the non-MR PIDs are `on_prem` and the -MR PIDs are `cloud` (the old data marked all of them as both).
- The guide does not say which domain code Turkey needs. The site says so and tells the reader to confirm it (`variant_note_tr`).

## Corrections to the legacy values

| Model | Legacy | Verified | Source |
| --- | --- | --- | --- |
| CW9164I | PoE for full function: 802.3at | 802.3bt (30 W, USB on); on at the USB port is off | CW9164 datasheet |
| CW9163E | PoE at / bt | af / at; full function at (25.5 W) | CW9163E datasheet |
| C9136I | PoE bt only | bt full; at works with smaller radios | C9136 datasheet |
| MR28, MR36, MR76, MR78 | PoE at | af (15 W) | Meraki datasheets |
| MR86 | PoE at / bt | at required (30 W) | MR86 datasheet |
| C9105AXW | uplink 1G | 2.5G (mGig) | C9105 datasheet |
| IW9165DH | 1 port, 1G | 2 ports, uplink up to 2.5G | IW9165 datasheet |
| CW9166, 9164, 9162, 9163E | management on_prem + cloud | on_prem for the base PID, cloud for -MR | Ordering Guide, datasheets |
| All EoS rows | generic Meraki policy link, note "CW917x Wi-Fi 7" | real bulletin, exact replacement PIDs | EOL15855 |

## Per series: datasheets read

| Series | Datasheet (cisco.com or documentation.meraki.com) | Datasheet date |
| --- | --- | --- |
| CW9179F | wireless-9179f-access-point-ds | 2026-04-06 |
| CW9178 | wireless-9178-series-access-point-ds | 2026-08-10 |
| CW9177 | wireless-9177-series-access-points-ds | 2026-08-27 |
| CW9176 | wireless-9176-series-acc-point-ds | 2026-10-06 |
| CW9174 | wireless-9174-series-access-points-ds | 2026-09-15 |
| CW9172 | wireless-9172-series-access-points-ds | 2026-09-15 |
| CW9171 | wireless-9171-series-acc-point-ds | 2026-04-06 |
| CW9166, 9164, 9162, 9163E, C9136 | the series datasheets | 2026-09-01 |
| C9124 | nb-06-cat9124-ser-ap-ds-cte-en | 2023-03-22 (old, no EoS notice) |
| C9130, C9120, C9115 | the series datasheets | 2023-11-29 |
| C9105 | datasheet-c78-744062 | 2022-11-03 |
| MR28, MR36, MR36H, MR44, MR46, MR46E, MR57, MR76, MR78, MR86 | documentation.meraki.com datasheet pages | pages show no date |
| IW9167 | cat-iw9167e-heavy-duty-ap-ds | 2025-09-23 |
| IW9165 | catalyst-iw9165-series-ds | 2026-05-28 |
| CBW150AX | business-access-point-ds | 2023-10-03 |

Each model's `source_url` is its datasheet; `datasheet_url` is the same link. The lifecycle evidence is in the two sections above.

## Judgement calls to review

- **Recommended picks** (one per series, my proposal from the verified specs): CW917x CW9172I-RTG, CW916x CW9162I, C9136 C9136I, C9124 C9124AXI, MR indoor MR57, MR outdoor MR78, IW9167 IW9167EH-E-AP, IW9165 IW9165E-E-AP, CBW CBW150AX-E-EU. Series with only End-of-Sale models (C9105, C9115, C9120, C9130) have none. Confirm or change them in the workbook.
- **PoE for full function** where the datasheet does not use that phrase: CW9177 (bt, the only mode with 4x4 on every radio and the 10G link), CW9174 (bt, the only mode with the 5G link and USB), CW9172I/H and CW9171I (at). The CW9172H and CW9172I tables do not say whether USB needs bt; the note does not claim it.
- **Uncertain "current"**: CW9177 (datasheet from Aug 2026; I found no official ordering statement, only reseller listings with long lead times), CW9172H (one reseller page calls it "soon End of Sale"; no Cisco notice found), IW9165 (datasheet May 2026; its series page returned 404 and Cisco's industrial wireless page lists it beside the IW9167). Ask your Cisco contact to confirm orderability.
- **Indoor/outdoor for CBW150AX and C9120/C9115/C9130**: the datasheets describe indoor use but give no formal rating; the legacy value (indoor) is kept.
- **Datasheet age**: C9124 (2023) and the Meraki pages (undated) carry no EoS notice, but their specs were not re-confirmed by a recent revision.
