# Phase 5: Stories verification

Checked on 13 Oct 2026 against Cisco and Meraki pages (fetched and read on that day). `last_verified` of every story is 2026-10-13 and `review_by` is 2027-01-11 (90 days). A page date is the date the page itself shows; "undated" means the page shows none.

## Stories and their sources

| Story (file) | Claims taken from | Page date |
| --- | --- | --- |
| Unified licensing (`unified-licensing.md`) | Meraki, Cisco Networking Subscription Licensing: products covered, one SKU per device family, terms 12 to 84 months, 12-month minimum (Meraki, wireless, C8000, C9200-M/C9300-M), 36-month minimum (C9350, C9610), cloud / mixed / on-premises mode for Wi-Fi 7, C9350 and C9610, one-time claim, binding to networks, co-term/PDL limits, PDL conversion needs a support case and is permanent. Cisco C9000 Smart Switching FAQ for the C9350/C9610 terms | Meraki page undated (© 2026); FAQ 21 Sep 2026 |
| Smart Switches (`smart-switches.md`) | Cisco C9000 Smart Switching FAQ: three series and their roles, upgrade paths, no stacking of C9350 with 9300/3850, management options, unified licence, mandatory at purchase, 3-year minimum, C9550/C9610 Advantage only. C9350 data sheet: 12 to 48 downlinks, up to 10G mGig, up to 90 W PoE per port | 21 Sep 2026 (both) |
| Live Protect (`live-protect.md`) | Cisco blog by Tom Gillis: Talos shield, eBPF, Monitor/Enforce/Disable, shipping on N9000, planned platforms with no dates. Cisco solution overview: patching gap, shields retire after the full upgrade, Essentials licence or higher | 2 Jun 2026; 10 Feb 2026 |
| Post-quantum cryptography (`post-quantum-cryptography.md`) | Cisco Trust Center: both risks, commitment "by December 2026", the two areas. Cisco blog on the WAN: PPK with SKIP and RFC 8784 today, native PQC planned, no release or date | undated; 13 Jan 2026 |
| Security Cloud Control (`security-cloud-control.md`) | Cisco FAQ: managed products, no extra cost for eligible products, subscription for more, pricing via sales or partner. Data sheet: rule analysis, gold configuration, change log with backup and rollback, AI assistant | 9 Oct 2026; 27 Mar 2026 |

## What is deliberately not in the stories

- **Licence transfer rules.** Meraki's co-term transfer page needs a login and Cisco's public pages say nothing about moving a subscription between devices, organisations or management modes. The licensing story says so and sends the reader to Cisco or Meraki in writing.
- **Catalyst 9200/9300 as unified-licence models.** A 2025 Cisco presentation (found by search, not read in full) says they are eligible; the Meraki page names only C9200-M and C9300-M, under the 12-month minimum, and says nothing more. Not claimed.
- **Defense Orchestrator.** A search summary calls Security Cloud Control its successor; the FAQ page text does not mention it. Not claimed.
- **Firewall PQC dates (FTD 10.5, ML-KEM) and C9350/C9550/C9610 secure-boot details** came from search summaries only. Not claimed.
- **Videos.** No story has `video_youtube_id`: no official Cisco video ID was verified. The player is built and ready.

## Open for you

- **Meraki MX and Security Cloud Control.** The March 2026 data sheet lists Meraki MX among the managed products; the 9 Oct 2026 FAQ does not. The story points to the FAQ and does not name MX. Confirm with Cisco before saying either way.
- **Name.** Cisco's newest pages call the service the security part of "Cisco Cloud Control". The story uses "Security Cloud Control" and says so.
- **Cisco 8000 Series Secure Routers vs Catalyst 8000.** The PQC story says the secure routers are "not on Tools4Us yet" and does not equate them with the Catalyst 8000 models in the catalog. Confirm the two families are separate.
- **Related models.** Only the licensing story links models (CW9172I-RTG, CW9176I-RTG). The Smart Switches (C9350/C9550/C9610), Nexus, Secure Router and security products are draft or outside the catalog, so those stories link to a family page (decision of 13 Oct 2026).
- **Turkish copy** of all five stories (and the English) needs native review. Featured order and picks are mine: licensing, Smart Switches, Live Protect, PQC; Security Cloud Control is published but not featured.
