# KVKK checklist for the lawyer

Prepared 14 Oct 2026. **This is not legal advice.** It lists what the site does, what the notice says, the gaps I can see by reading it, and the questions only a lawyer can answer. The notice text itself, Turkish and English side by side, is in `docs/Phase7_KVKK_Notice_Text.md` (regenerate with `npm run kvkk:text`). `npm run kvkk:check` proves that the built pages still carry every element listed in part A; it does not judge whether the wording is enough.

## What the site does with personal data

| Where | What happens | Who receives it |
| --- | --- | --- |
| Request form (`/tr/iletisim/`) | Name, email, optional company, message, optional shortlist (model names and part numbers), the page address and the site language are sent when the visitor presses "Gönder". A required checkbox records consent; a hidden field and a 3 second minimum hold back bots. | Web3Forms (servers outside Turkey), which forwards the message to the owner's mailbox |
| Page view counter | On every page open: page address without the part after `?`, page title, screen width, referring site name, a robot flag; named events only by name ("added to shortlist"). The visitor's IP address and browser details reach the counter's server because the browser connects to it. Nothing is sent when Do Not Track or Global Privacy Control is on. No cookies. | GoatCounter (server may be outside Turkey) |
| Shortlist | Kept in the visitor's browser storage only. Sent nowhere unless the visitor ticks the box on the form. | Nobody |
| Search, selectors, compare | Run in the browser; nothing is sent. | Nobody |

## A. What the notice already has (checked by `npm run kvkk:check`)

| Element expected in an Aydınlatma Metni | Where in the notice | Status |
| --- | --- | --- |
| Identity of the data controller and how to reach them | "Veri sorumlusu": `{name}`, `{email}` from `src/lib/site-config.mjs` | **Open: both are still "TO FILL"** |
| Data processed | "Hangi verileri işliyoruz?" (form data) and "Çerezler ve ziyaret istatistiği" (counter data) | Present |
| Purpose | "Hangi amaçla?": reply to the message; no marketing email | Present |
| Legal basis | "Hukuki sebep": explicit consent, KVKK art. 5/1, for the form | Present for the form only (see B2) |
| Transfer abroad | "Yurt dışına aktarım": Web3Forms, servers outside Turkey, explicit consent | Present (see B1) |
| Retention | "Saklama süresi": until answered and follow-up is over, then deleted | Present (see B6) |
| Data subject rights | "Haklarınız (KVKK madde 11)": six items and how to apply | Present, but the list is shorter than art. 11 (see B10) |
| Cookies and statistics | No cookies; GoatCounter described in full | Present |
| Consent box on the form | Required checkbox, links to the notice, names the transfer abroad | Present |
| Independence disclaimer | Footer on every page (`check:dist`) | Present |

## B. Gaps I can see (for the lawyer to confirm or dismiss)

1. **Transfer abroad rests on consent only.** As I understand the 2024 change to KVKK art. 9, explicit consent covers only incidental (non-repeated) transfers, and regular transfers need an adequacy decision or an appropriate safeguard such as a standard contract. A contact form that sends to Web3Forms every time is a regular transfer. Does the current wording and checkbox satisfy art. 9, or does the site need another route (a different form provider in Turkey or the EU with adequacy or a standard contract, or a mail-to link instead of a form)?
2. **Legal basis for the visit counter is not stated.** The counter processes an IP address and browser details of every visitor, with no consent. The notice describes the data but names no legal basis (for example legitimate interest, art. 5/2-f). I think it should name one, or the counter should be dropped or made opt-in; whether the counter's data counts as personal data at all depends on how GoatCounter handles the IP address (see C).
3. **One checkbox covers two consents** (processing for the reply, and the transfer abroad). Should they be two separate boxes?
4. **No sentence about withdrawing consent.** The notice does not say the visitor can withdraw consent and how. I have not added wording: it is a legal sentence.
5. **Method of collection** (the notice should probably say "through the web form, automatically") is not stated in those words.
6. **Retention is vague for the processor.** "Until answered, then deleted" describes the owner's mailbox. It says nothing about how long Web3Forms keeps a copy (the owner must read Web3Forms' own terms, see C).
7. **Recipients.** The notice names Web3Forms and GoatCounter. It does not name the owner's own email provider, which also stores the message.
8. **Controller details.** Is name plus email enough, or should the postal address also appear? Is a registration with VERBİS required for this project, or does an exemption apply?
9. **English text.** The English notice is a translation of the Turkish. Which one is authoritative if they differ?
10. **The rights list may be incomplete.** The notice lists six rights. As far as I can tell art. 11 has more items (for example objecting to a result against the person that comes only from automated analysis, and asking for compensation for loss caused by unlawful processing, which the notice mentions only in part). Does the list need to follow art. 11 item by item? Also: does the notice have to follow the elements of the Communiqué on the duty to inform (Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ) in a set order or wording?

## C. Facts only the owner can confirm (before the lawyer reads)

- [ ] Fill `controller.name` and `controller.email` in `src/lib/site-config.mjs` (`npm run check:data` and `check:dist` warn until then).
- [ ] Web3Forms: how long they keep submissions, where, and whether the free plan stores them at all (their privacy policy and dashboard); the monthly submission limit; spam protection switched on in the dashboard; the inbox the key belongs to is the one you want.
- [ ] GoatCounter: whether the IP address is stored or only used to count, where the servers are, and the retention period (their documentation); if different from `privacy.cookies.p`, tell me and I will change the sentence.
- [ ] After the first push: a real visit shows up in the GoatCounter dashboard and one real form message arrives (`docs/Phase7_Live_Checks.md`).

## D. Questions for the lawyer (Turkish and English)

| # | Soru | Question |
| --- | --- | --- |
| 1 | Form yurt dışındaki bir hizmete (Web3Forms) her seferinde veri gönderiyor. Açık rıza tek başına KVKK m. 9'a göre yeterli mi, yoksa başka bir yol gerekir mi? | The form sends data to a service abroad every time. Is explicit consent enough under art. 9, or is another route needed? |
| 2 | Ziyaret sayacı (GoatCounter) IP adresi ve tarayıcı bilgisini rızasız işliyor. Hangi hukuki sebep yazılmalı, ya da sayaç kaldırılmalı mı? | The visit counter processes IP and browser data without consent. Which legal basis should the notice state, or should the counter go? |
| 3 | İşleme rızası ve yurt dışı aktarım rızası iki ayrı onay kutusu olmalı mı? | Should consent to processing and to the transfer be two separate boxes? |
| 4 | Rızanın geri alınması nasıl anlatılmalı? Önerdiğiniz cümleyi yazar mısınız? | How should withdrawal of consent be described? Please draft the sentence. |
| 5 | Veri sorumlusu için ad ve e-posta yeterli mi, adres gerekir mi? VERBİS kaydı gerekir mi? | Are name and email enough for the controller, or is an address needed? Is VERBİS registration required? |
| 6 | Saklama süresi cümlesi ("yanıt verilene ve gerekli takip bitene kadar") yeterince açık mı? | Is the retention sentence precise enough? |
| 7 | Metin kişisel bir proje için orantılı mı, eksik ya da fazla bir şey var mı? | Is the notice proportionate for a personal project; is anything missing or unnecessary? |
| 8 | Türkçe ve İngilizce metinden hangisi esas alınır? | Which of the Turkish and English texts governs? |
| 9 | Haklar listesi KVKK m. 11'in tüm bentlerini ve Aydınlatma Tebliği'nin sırasını karşılıyor mu? | Does the rights list cover every item of art. 11, and does the notice follow the Communiqué? |

## E. After the lawyer

1. Send the corrections as text. I apply them through the review kit (`npm run review:apply`, rows marked "KVKK ve form") or edit `src/i18n/*.json` directly, then run `npm run check:data`, `npm run kvkk:check` and `npm run build`.
2. If the lawyer asks for a second checkbox, a withdrawal sentence or a different form route, that is a code change: ask me for a small plan first.
3. Record the outcome in `docs/Phase7_KVKK_Review.md` (the launch gate reads the line `Result:`).
