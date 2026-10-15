# Live checks after the first push

`npm run check:launch` shows this check as passed only when the line below says `Result: PASS`. The gate line is the one in its title: **GoatCounter shows a page view and one real Web3Forms message arrives**. These need the real services, so no script can do them. Run `npm run check:live` first: it proves everything that needs no service (pages, head tags, sitemap, notice, form markup, the pinned script). Then do these on the live site (`https://denizycode.github.io/tools4us/`).

Result: PASS

## The gate line (done)

- [x] The Pages deploy run is green and the pages answer 200; an unknown address shows the 404 page. Checked by `npm run check:live` on 14 Oct 2026 (29 of 30 checks; the one warning is the contact email below).
- [x] **GoatCounter:** page views from the live site show in the dashboard. Reported by the owner on 15 Oct 2026.
- [x] **Web3Forms:** a real message sent from `/tr/iletisim/` arrived in the inbox. Reported by the owner on 15 Oct 2026.

## Also before launch (not part of the gate line, still open)

- [ ] Confirm the `shortlist-add` event and `search-zero` show in GoatCounter, and that no address in the dashboard has a `?` part.
- [ ] The GoatCounter settings show what it keeps about IP and browser; if that differs from the sentence in the notice (`privacy.cookies.p`), tell me.
- [ ] Web3Forms dashboard: the monthly limit of your plan is known, spam protection is on, the form refuses to send without the consent box ticked.
- [ ] The KVKK notice shows your real email, not "TO FILL" (`controller.email` in `src/lib/site-config.mjs`; `npm run check:live -- --strict` fails until then).
- [ ] On a phone: open one story, one End-of-Sale model page (the replacement link works) and a shortlist share link.
- [ ] The weekly checks workflow runs by hand (Actions, "Weekly checks", Run workflow) and finishes; read its summary.

Record the date and who did it:

| Date | Who | Notes |
| --- | --- | --- |
| 14 Oct 2026 | Claude | `npm run check:live`: 29 of 30 pass, deploy green |
| 15 Oct 2026 | Deniz Yarpınar (owner, told in chat) | GoatCounter page views and one Web3Forms message work |
