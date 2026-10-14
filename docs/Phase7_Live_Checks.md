# Live checks after the first push

`npm run check:launch` shows this check as passed only when the line below says `Result: PASS`. These need the real services, so no script can do them. Run `npm run check:live` first: it proves everything that needs no service (pages, head tags, sitemap, notice, form markup, the pinned script). Then do these on the live site (`https://denizycode.github.io/tools4us/`), once, after the push.

Result: PENDING

- [ ] The Pages deploy run is green (Actions tab) and `/tr/`, `/en/`, `/tr/kablosuz/`, `/tr/anahtarlama/`, `/tr/yonlendirme/`, `/tr/yenilikler/`, `/tr/seclimlerim/`, `/tr/iletisim/` answer 200; an unknown address shows the 404 page.
- [ ] **GoatCounter:** open the live site in a normal tab (not a private tab with Do Not Track on), click through three pages, add a model to Seçimlerim. The page views and the event `shortlist-add` (or the event name in `src/lib/track.mjs`) show in your GoatCounter dashboard within a minute. (localhost is ignored by GoatCounter, so this can only be checked live.)
- [ ] The GoatCounter dashboard shows what it keeps about IP and browser; if it differs from the sentence in the notice (`privacy.cookies.p`), tell me.
- [ ] **Web3Forms:** send one real message from `/tr/iletisim/` (tick the consent box). It arrives in your inbox with the name, email, message, page address and, if ticked, the shortlist. Check the spam folder too. Check the free plan's monthly limit and that spam protection is on in the Web3Forms dashboard.
- [ ] The form still refuses to send without the consent box ticked (try it).
- [ ] The KVKK notice shows your real name and email, not "TO FILL".
- [ ] `DIST_DIR` checks cannot test the live site, so open one story, one End-of-Sale model page (replacement link works) and the shortlist share link on a phone.
- [ ] After a day: the weekly checks workflow can be started by hand (Actions, "Weekly checks", Run workflow) and finishes; read its summary.

Record the date and who did it:

| Date | Who | Notes |
| --- | --- | --- |
| | | |
