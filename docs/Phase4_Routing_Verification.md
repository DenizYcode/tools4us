# Phase 4: routing verification (13 Oct 2026)

98 of 114 in-scope routing models went from `draft` to `ready` (51 ASR/NCS routers stay `excluded`). Each was checked against a Cisco or Meraki datasheet or an End-of-Sale bulletin on 2026-10-13 (`last_verified`). The values are applied by `scripts/build-data/fill/routing-pass1.mjs`. Turkish and English text is generated from the verified specs with fixed templates plus one hand-written explainer per series; it needs native review. Nothing was invented: where a source was silent or unreadable the row stays draft (see `docs/Phase4_Routing_Needs.md`).

## What the two throughput numbers mean

- `throughput_mbps`: Cisco = forwarding throughput (512-byte packets, "up to"); Meraki MX = stateful firewall throughput.
- `security_throughput_mbps`: Cisco = IPsec throughput (512-byte packets); Meraki MX = next-generation firewall (NGFW, detection) throughput; Z-Series = "security throughput".
- The legacy file mixed several metrics in the second number (IPsec, SD-WAN, threat protection). It is replaced by the datasheet value on every current row.
- **End-of-Sale rows keep the legacy `throughput_mbps` and have no security number.** They were not re-verified (the audit flagged inconsistencies in the ISR 1100 numbers, #216-#238), and the site never recommends them.

## How "current" was decided

Same method as Phase 3: a datasheet exists with no End-of-Sale notice, the product's End-of-Sale notice listing shows no bulletin naming the PID, and no bulletin found by search names it. For the Catalyst 8000 G2 models the listing pages show no hardware bulletin; for Meraki MX, vMX and Z4C the model is absent from [Meraki's End-of-Life policy page](https://documentation.meraki.com/General_Administration/Other_Topics/Product_End-of-Life_(EOL)_Policies). This is weaker than a Cisco ordering check; ask your Cisco contact to confirm "orderable" for the Catalyst 8000 G2 series and the C1121/C1126/C1127 models.

## Most of the ISR 1000 family is End-of-Sale

The legacy file and the audit marked only some ISR 1000 models as End-of-Sale. The Cisco notice listing for the ISR 1000 series shows more, and the old "unverified" rows would have been shown as current. Of the ISR 1000/1100 rows published, most are End-of-Sale; only the C1109-4PLTE2P and the C1121, C1126 and C1127 families are current.

## End-of-Sale models

| Models | Lifecycle | Last order | Replacement named by the bulletin | Bulletin |
| --- | --- | --- | --- | --- |
| ISR1100-4G, ISR1100X-4G | eos | 2026-07-28 | C1121X-8P | [EOL15648](https://www.cisco.com/c/en/us/products/collateral/routers/1000-series-integrated-services-routers-isr/isr1100-isr1100x-series-routers-eol.html) |
| ISR1100-4GLTEGB | eos | 2026-07-28 | C1121X-8PLTEP | same |
| ISR1100-6G, ISR1100X-6G | eos | 2026-07-28 | C8200-1N-4T (itself End-of-Sale), kept as a note | same |
| C1101-4P, C1101-4PLTEP, C1109-2PLTEGB | eos | 2026-07-28 | C1121-4P / C1121-4PLTEP | [EOL15650](https://www.cisco.com/c/en/us/products/collateral/routers/1000-series-integrated-services-routers-isr/select-isr-1101-1109-series-routers-eol.html) |
| C1111-4P, -4P-DNA, -8P, -8P-DNA, C1111X-8P | eos | 2026-07-28 | C1121-4P, C1121X-8P, C1121-8P, C1121X-8P, C1121X-8P | [EOL15719 (amended)](https://www.cisco.com/c/en/us/products/collateral/routers/1000-series-integrated-services-routers-isr/isr-1111-series-ethernet-routers-eol.html) |
| C1112-8P, C1113-8P, C1113-8PM, C1161-8P, C1161X-8P, C1161-8PLTEP, C1161X-8PLTEP | eos_announced | 2027-01-31 | none | [EOL15945](https://www.cisco.com/c/en/us/products/collateral/routers/1000-series-integrated-services-routers-isr/c1112-1113-1116-1117-1131-1161-series-isr-eol.html) |
| C1116-4P, C1117-4P, C1117-4PM | eos_announced | 2027-01-31 | C1126-8PLTEP, C1127-8PLTEP, C1127-8PMLTEP | same |
| C921-4P, C921-4PLTEGB, C931-4P | eos | 2026-07-28 | C1121-4P, C1121-4PLTEP, C1121-4P | [EOL15644](https://www.cisco.com/c/en/us/products/collateral/routers/900-series-integrated-services-routers-isr/isr-900-series-routers-licenses-accessories-eol.html) |
| C926-4P, C927-4P, C927-4PM, C927-4PLTEGB | eos | 2026-07-28 | C1126-8PLTEP / C1127-8PLTEP (the bulletin also names C1116-4P, C1117-4P, C1117-4PM: kept as notes) | same |
| C8200-1N-4T, C8200L-1N-4T | eos_announced | 2027-07-31 | C8235-E-G2, C8231-E-G2 | [EOL15955](https://www.cisco.com/c/en/us/products/collateral/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8300-2n2s-4t2x-6t-1n-4t-c8200l-eol.html) |
| C8300-2N2S-4T2X, C8300-2N2S-6T | eos_announced | 2027-07-31 | none ("no migration product") | same |
| C8300-1N1S-4T2X, C8300-1N1S-6T | eos_announced | 2027-01-31 | C8375-E-G2 | [EOL15950](https://www.cisco.com/c/en/us/products/collateral/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8500l-8s4x-4t2x-c8300-1n1s-6t-eol.html) |
| C8500L-8S4X | eos_announced | 2027-01-31 | C8475-G2 | same |
| C8500-12X, C8500-12X4QC | eos_announced | 2027-01-31 | C8550-G2, C8570-G2 | [EOL15949](https://www.cisco.com/c/en/us/products/collateral/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8500-12x-c8500-12x4qc-eol.html) |
| C8500-20X6C | eos_announced | 2027-07-31 | C8650-G2 | [EOL15954 (amended)](https://www.cisco.com/c/en/us/products/collateral/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8500-20x6c-eol.html) |
| MX67C, MX68CW | eos_announced | 2026-11-27 | C8111-C-G2-MX, C8121-CW-G2-MX (not published yet: notes) | [EOL15861](https://www.cisco.com/c/en/us/products/collateral/security/meraki-cloud-managed-security-appliances/mx67c-mx68cw-eol.pdf), announced 27 Aug 2026 |
| MX84 | eos | 2021-10-31 | MX85 | Meraki EoL table (announced 10 Aug 2021, last support 31 Oct 2026) |
| Z3, Z3C | eos | 2024-09-04 | Z4 / Z4C (not published: note) | Meraki EoL table (Z3C-HW-WW ended earlier, 11 Feb 2024) |

The last-order dates the audit seeded all match the bulletins.

## Corrections to the legacy values

| Model(s) | Legacy | Verified | Source |
| --- | --- | --- | --- |
| C8130-G2, C8130-VAI/-VAP-G2, C8130H-G2, C8140-G2 | no SD-WAN | SD-WAN supported (from IOS XE 26.2.1; the note says so) | Catalyst 8100 datasheet |
| C8131, C8151, C8151-CVAI, -CVAP, C8151H-C, C8161-G2 | second number 1000 Mbps (threat protection) | IPsec 1500 Mbps | Catalyst 8100 datasheet |
| C8211, C8221, C8221L, C8225-G2 | no throughput | 5.6 / 19 Gbps forwarding, 3 / 5 Gbps IPsec | Catalyst 8200 datasheet |
| C8221, C8221L, C8225, C8231, C8231-E, C8235, C8235-E-G2 | 2 WAN ports | 4 WAN ports (2 x SFP+ or 10G, plus 2 x 1G or mGig) | Catalyst 8200 datasheet |
| C8355-G2 | 2 NIM + 2 SM slots | no NIM or SM slot, one PIM | Catalyst 8300 datasheet |
| C8375-E-G2 | 2 WAN, 2 NIM, 2 SM, no cellular | 6 WAN ports, 1 NIM, 1 SM, 1 PIM (pluggable cellular), IPsec 20 Gbps | Catalyst 8300 datasheet |
| C8455, C8475, C8550, C8570-G2 | second number = SD-WAN figure (or empty) | IPsec 31 / 45 / 48 / 63 Gbps | Catalyst 8400 and 8500 datasheets |
| C8650-G2 | no throughput | 540 Gbps forwarding, 225 Gbps IPsec | Catalyst 8600 datasheet |
| C1121, C1126, C1127 families (14) | throughput 450-670 Mbps, LTE embedded, 1 WAN | forwarding 1600 Mbps, IPsec 500-600 Mbps, LTE/5G is a pluggable module, C1121 has dual WAN | ISR 1000 datasheet |
| C1109-4PLTE2P | 340 Mbps, embedded | 1300 Mbps forwarding, IPsec 400 Mbps, two pluggable LTE slots | ISR 1000 datasheet |
| C1101-4PLTEP, C1109-2PLTEGB, C1161(X)-8PLTEP | embedded cellular | pluggable (the "PLTE" naming of the C1121 datasheet; End-of-Sale rows follow the same naming) | ISR 1000 datasheet |
| MX68, MX68W, MX68CW | advanced security 300 Mbps | 400 Mbps (NGFW detection) | MX67/MX68 datasheet |
| MX85 | 100 VPN tunnels | 200 | MX85 datasheet |
| MX250 | 7000 Mbps | 7500 Mbps | MX250 datasheet |
| All ready rows without cellular | empty | `none` (a stated value; a required field now) | datasheets |

## Judgement calls to review

- **Recommended models:** C8151-G2, C8231-G2, C8375-E-G2, C8455-G2, C8550-G2, C1121-8P, MX67, MX68, vMX-M. Confirm or change them (`recommended`, `recommended_why_tr`).
- **Licence:** the Catalyst 8000 and ISR datasheets do not state a licence requirement; the note says so and mentions the Cisco DNA subscription and the HSEC licence for encrypted traffic above 250 Mbps (Cisco "Configure Licenses and Throughput for Catalyst 8000" guide, which applies to the older models; whether it applies to the G2 routers is not stated). Meraki MX, vMX and Z-Series: "Lisans gerekir" from the Meraki licensing documentation (one licence per device; Enterprise, Advanced Security or Secure SD-WAN Plus) and the vMX datasheet.
- **C1126/C1127 and the "X" and "M" suffixes:** the ISR 1000 datasheet lists them as "C1126(X)-8PLTEP" and "C1127(X)-8P(M)LTEP" and gives performance only per family. Their numbers follow the family heading.
- **Catalyst 8100 DSL and 5G models:** ports are kept from the legacy file; the datasheet lists DSL and 10G WAN options that the legacy count does not show.
- **Z3 and Z3C:** the replacement (Z4 / Z4C) comes from the audit, not from reading the Meraki bulletin PDFs. Z3C has two SKUs with different dates; the later one is stored.
- **MX84:** the replacement (MX85) comes from the audit; the bulletin PDF was not read.
- **Reading limits:** the Meraki datasheets for the -MX Catalyst 8000 models and for the Z4 could not be read (the specs are an embedded image or too long for the page reader), so those rows stay draft.
