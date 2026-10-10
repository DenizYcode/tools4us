# Phase 3: wireless rows still draft, and what is missing

After the Phase 3 data pass: **67 of 68 wireless models are `ready`**, 1 is `draft`. All 66 wireless accessories (antennas) are still `draft`; they are for the configuration builder, which moves to Phase 4.

| Row | Why it is still draft | What is needed |
| --- | --- | --- |
| CBW151AXM-E-EU (mesh extender) | The datasheet does not state ports or uplink, and lists only `CBW151AXM-x`, not the exact `-E-EU` PID. It is powered from an AC socket, with no PoE, so it does not fit the PoE fields that a ready wireless row must carry. | Confirm the exact PID and port count from the ordering guide, and decide how to show an AC-powered extender (an `ac_powered` exception to the PoE rule, or keep it out of the selector). |

Also open (not blocking):

- Turkish copy for 67 models, 13 series explainers, licence, PoE and variant notes is a draft and needs native review.
- Antenna accessories (66 rows) need source URLs, `last_verified` and lifecycle before the configuration builder (Phase 4) can use them.
- Orderability of CW9177, CW9172H and IW9165 is inferred (see `docs/Phase3_Wireless_Verification.md`, "Judgement calls").
