# Cisco Partner Rehberi — Site Refresh Spec

Oct 9, 2026 · @Deniz

## How to use this spec

This spec is the single source of truth for rebuilding the Cisco Sizing Tool as Cisco Partner Rehberi, a Turkish-first partner hub, in Claude Code. It lives in the repo as `docs/SPEC.md`, and `CLAUDE.md` points at it so every session starts with the same rules. From Phase 0 on, this repo copy is the source of truth; the Claude doc it was exported from is an archived draft.

- **MUST** = required for launch. **SHOULD** = launch if time allows. **LATER** = backlog.
- Build phase by phase (see Build plan). A phase is finished only when its acceptance checks pass.
- Changes to scope go into this spec first, then into code. Never the other way round.
- **Open gap:** the old site's code is reviewed under Old site review, together with the decisions recovered from the lost discussion. Its CSV dataset is in the repo under data/legacy/ and was audited on 9 Oct 2026 (docs/Phase1_Dataset_Audit.xlsx: 348 issues, 118 High).

## Purpose and audience

The hub lets a Turkish partner describe a need in plain Turkish and leave with the right current Cisco models, while learning about new Cisco capabilities worth pitching. It is a personal, unofficial project that also helps market Cisco to partners.

**Primary audience:** sales and presales staff at Turkish SMB and mid-market Cisco partners. Cisco knowledge ranges from none to moderate, and many prefer Turkish.

**Secondary audience:** end customers who receive a link from their partner, and the site owner, who is the only editor.

**Not the audience:** experienced Cisco engineers who need CCW-level configuration detail. Serve them with datasheet links, not more fields.

**Jobs the site must do:**

1. "I need 24 ports and power for 8 cameras. Which model?" → guided selector.
2. "What is the difference between these two?" → comparison.
3. "I have an old model. What replaces it?" → migration finder.
4. "What is new at Cisco that I can sell?" → stories hub.
5. "I need to explain this to my customer in Turkish." → shareable pages and a printable shortlist.

**Revisions to your draft:**

- "Selecting models they may not know" becomes "describe a need, get a model". Users who don't know the catalog can't browse it; they need questions, not lists.
- Added a business goal. Every page should lead somewhere: a shortlist, a story, or a request for help through the contact form. Otherwise the site informs but doesn't sell.

## Pages and sections

One hub, six product families on a shared template (Collaboration and Security are new), two basic list pages for Cameras and Cellular, plus content and tool pages that work across families.

Site map:

- **Hub** (`/tr/`, `/en/`) → family buttons, featured stories, shortcuts
- **Families:** Switching, Wireless, Routing, Data Center, Collaboration, Security → series → model detail pages
- **Basic lists:** Cameras (Meraki MV), Cellular (Meraki MG)
- **Content:** Stories index → story pages; Glossary
- **Tools:** Compare, Shortlist ("Seçimlerim"), Search, Migration finder, Contact form

Every family page leads to model detail pages; every story page links back to the models it mentions.

| Section | Holds | Launch |
| --- | --- | --- |
| Home hub | Hero, search, family buttons, featured stories, shortcuts | MUST |
| Switching | Catalyst 1200/1300, 9200/9300/9500, Meraki MS and Meraki-mode Catalyst | MUST |
| Wireless | Wi-Fi 6E and Wi-Fi 7 indoor/outdoor APs, wireless controllers, Meraki-mode APs | MUST |
| Routing | Branch and edge routers, SD-WAN, industrial and cellular routers | MUST |
| Data Center | Nexus 9000 leaf and spine switches | SHOULD |
| Collaboration (new) | Room devices, boards, desk devices, phones, headsets | SHOULD |
| Security (new) | Secure Firewall and Meraki MX appliances | MUST |
| Cameras (basic) | Meraki MV models with lifecycle status only; no selector or comparison | SHOULD |
| Cellular (basic) | Meraki MG gateways with lifecycle status only; no selector or comparison | SHOULD |
| Stories | Featured strip on the hub plus a filterable stories index | MUST |
| Glossary | Every tooltip term, TR and EN | SHOULD |
| Compare, Shortlist, Search | Shared tools reachable from every page | MUST |
| Contact form | Request help through Web3Forms with the shortlist attached | SHOULD |

**Revisions to your draft:**

- Meraki is a management choice, not a section. Show it as a filter in each family so partners compare Meraki and Catalyst options side by side.
- Cameras (Meraki MV) and Cellular (Meraki MG) get basic pages: model list and lifecycle only, no selector or comparison.
- Data Center and Collaboration rarely come from SMB partners. Launch them as SHOULD so the core four reach quality first.

## Features

Your six features stay, each sharpened. Seven more are needed for the new vision: the guided selector, lifecycle badges and the shortlist matter most, because they turn browsing into a decision.

### Your features, revised

| Feature | Priority | What it must do |
| --- | --- | --- |
| Forms | MUST | Two kinds. A need-based selector form per family, and a contact / BoM request form. The contact form posts to Web3Forms and needs KVKK consent text. |
| Filters | MUST | Faceted filters per family with plain-Turkish labels ("Kaç port?", "Kamera / AP besleyecek mi?") and a tooltip on each technical term. Result count updates live. |
| Text search | MUST | One global search across models, PIDs, features, glossary and stories. Must match Turkish characters both ways (ı/i, ş/s, ğ/g) and tolerate typos. Searching an old PID returns its replacement. |
| Language toggle | MUST | TR default, EN optional. Language lives in the URL (`/tr/…`, `/en/…`) so shared links open in the right language. Covers UI, model text and stories. |
| Info boxes | MUST | "Bu ne demek?" boxes and glossary tooltips for jargon (PoE+, mGig, stacking, SD-WAN, Network Advantage). One glossary feeds every tooltip. |
| Comparison table | MUST | 2–4 models side by side, "show only differences" switch, shareable URL, print-friendly. On phones, columns swipe with the first column pinned. |

### New features for the vision

| Feature | Priority | What it must do |
| --- | --- | --- |
| Guided selector ("Bana model öner") | MUST | 4–6 plain questions per family: users or ports, PoE devices, cloud or on-prem management, indoor or outdoor, growth. Returns 1–3 current models, each with a one-line "why". |
| Lifecycle badges | MUST | Current / End-of-Sale announced (with date) / replacement link. The selector never recommends an End-of-Sale model. |
| Model detail page | MUST | Plain-language summary, key specs, "good for", licence note, datasheet link, related stories. |
| Shortlist ("Seçimlerim") | MUST | Collect models across families, then print or export (PDF or Excel) to send to a partner or customer. No prices. |
| Stories hub | MUST | Featured stories on the hub plus a stories index (see Content hub section). |
| Migration finder ("Eski cihazım var") | SHOULD | Legacy model in, current replacement out, with what changes (licensing, power, management). High value for refresh deals. |
| Glossary page | SHOULD | Every tooltip term in one page, TR and EN. |
| Request presales help | SHOULD | Sends the shortlist and contact details through Web3Forms to the owner's inbox. Not an order and not a quote. |
| Analytics | SHOULD | Keep GoatCounter from the old site (cookieless, already wired to filter, model and datasheet events). Track searches with zero results, selector completions, story clicks. This tells you what to write next. |
| Freshness stamps | MUST | "Son doğrulama" date on every family page and story. |
| Family and series explainers | MUST | One plain sentence per family and per series, Turkish first, above its models: who it is for and where it sits ("C9200L: Catalyst anahtarlama ailesine KOBİ giriş noktası"). |
| Recommended model ("Önerilen") | MUST | One pick per series, set by hand in the data with a one-line reason. The guided selector also returns it first when it fits. Never an End-of-Sale model. |
| Configuration builder (carried over) | MUST | Modules, line cards and antennas with slot limits and a live SKU string, as on the old site. The result can be added to the shortlist. |
| Management toggle (carried over) | MUST | On-Prem / Cloud / Unified first on each family page (Nexus / SAN / Hyperfabric on Data Center), driven by the explicit management field. |
| Numeric queries (carried over) | SHOULD | Keep the router's ports and throughput inputs; add PoE budget (W) on switching and throughput on Security. |
| "Yeni" badge | SHOULD | Marks models added in the last 90 days, from an added_date field. |

## Content hub and stories

The hub shows 3–4 featured stories at a time, each leading to a story page and from there to the models it relates to. Stories are the marketing engine; models are where they convert.

**Hub layout (top to bottom):**

1. Hero: one-line promise in Turkish, global search box, TR/EN toggle.
2. Family buttons: Switching, Wireless, Routing, Data Center, Collaboration, Security, plus smaller links to Cameras and Cellular.
3. Featured stories: 3–4 cards, chosen by a `featured: true` flag and an order number.
4. Shortcuts: "Bana model öner", "Eski cihazım var", "Karşılaştır".

**Story card:** image or short muted video loop, category tag, Turkish headline (max ~60 characters), 1–2 line teaser, "Devamını oku".

**Story page:** headline, published and last-verified dates, body in plain Turkish, image or video, "Neden önemli?" box (why a partner should care), related models (links into the catalog), source links to Cisco, and a call to action ("Bu ürünü incele" or "Bize sorun").

**Story categories:** Yenilik (new tech), Lisanslama, Güvenlik, Ürün ailesi, Etkinlik / Eğitim.

**Seed stories:** PQC, unified licensing and licence transfer, Smart Switches, Live Protect, Security Cloud Control. Each must be checked against a current Cisco source before publishing, and the source linked on the page.

**Video:**

- Full videos: YouTube embed via `youtube-nocookie.com`, loaded only on click (thumbnail first). Embed Cisco's official videos; never re-host them.
- Card motion: optional self-hosted MP4 or WebM loop, muted, 5–10 s, under ~3 MB, with a poster image. Own or licensed footage only.
- Always show a "YouTube'da izle" fallback link, since some corporate networks block YouTube.
- Respect the reduced-motion setting: no autoplay loops for those users.

**Freshness rules:** every story has a `review_by` date (default 90 days). After it passes, the story drops off the featured strip until someone re-verifies it.

## Data model and editing

All content lives in files, separate from code: one spreadsheet per product family and one Markdown file per story. Editing means changing a cell or a text file, then running a build that checks everything before it publishes.

**Stack (proposal for Claude Code to confirm):** a static site with no server and no database, deployed to GitHub Pages (denizycode.github.io) by a GitHub Actions workflow. A static generator (for example Astro), a static search index that handles Turkish (for example Pagefind), and plain CSS or Tailwind. Claude Code should propose the final stack in Phase 0 and record why in `docs/SPEC.md`.

**GitHub Pages notes:** Pages serves static files only, so search runs in the browser and the contact form posts straight to Web3Forms. If the site lives in a project repo rather than the `denizycode.github.io` repo, every link and asset needs the repo name as a base path; set it once in the generator's config.

**Folder layout:**

```
/data/catalog/switching.xlsx   (or .csv) — one sheet per family
/data/glossary.csv             — term, TR, EN
/content/stories/*.md          — one file per story, TR + EN
/public/images/                — product and story images
/scripts/build-data            — converts sheets to JSON and validates
```

**Common model fields (every family):**

| Field | Example | Rule |
| --- | --- | --- |
| pid | CW9172I | Unique key |
| family / series | Wireless / CW9170 | Drives navigation and filters |
| name_tr, summary_tr, good_for_tr | "Küçük ofisler için Wi-Fi 7" | Required. EN versions optional at launch |
| lifecycle | current / eos_announced | Required |
| replacement_pid, eol_bulletin_url | CW9176I / cisco.com EoL bulletin link | Required when lifecycle is not current |
| management | Catalyst Center, Meraki, Cisco Business | Multi-value |
| licence_note_tr | "Abonelik lisansı gerekir" | Required where a licence is mandatory |
| datasheet_url, source_url | cisco.com link | Required |
| last_verified | 2026-10-09 | Required |
| eos_announced, last_order, ldos | 2026-03-30 / 2026-12-31 / 2031-12-31 | Required when lifecycle is eos_announced, with the EoL bulletin URL |
| added_date | 2026-10-09 | Required; drives the "Yeni" badge |
| recommended, recommended_why_tr | yes / "Çoğu ofis için yeterli PoE ve 10G uplink" | At most one per series; build fails if an End-of-Sale model is recommended |
| series_intro_tr, series_intro_en | "Catalyst anahtarlama ailesine KOBİ giriş noktası" | Kept in a separate series sheet, one row per series; TR required |

**Lifecycle routine (monthly):** check Cisco's End-of-Sale bulletins for each family. A newly announced model gets `eos_announced` and a replacement, keeps its page with a badge, and drops out of the selector and recommendations at once. After its last order date it moves to an "Eski modeller" list used by the migration finder. New models are added with `added_date` and verified specs; the build refuses rows without a source and a `last_verified` date.

**Family-specific key specs:**

- **Switching:** ports and speeds, uplinks, PoE budget (W), PoE standard, stacking, L2/L3, mGig.
- **Wireless:** Wi-Fi generation, streams, bands (6 GHz), uplink speed, PoE needed for full function, indoor/outdoor, antenna type.
- **Routing:** throughput, IPsec throughput and the licence it depends on, WAN ports, LTE/5G, SD-WAN support, module slots.
- **Data Center:** port speeds, role (leaf / spine), NX-OS or ACI, licence tier.
- **Collaboration:** device type, room size, camera, display, platform (Webex / Microsoft Teams), peripherals.
- **Security:** firewall and threat throughput, VPN throughput, ports, HA, management (FMC / Security Cloud Control).

**Story frontmatter:** `title_tr`, `title_en`, `teaser_tr`, `teaser_en`, `category`, `image`, `video_youtube_id`, `related_pids`, `featured`, `order`, `published`, `last_verified`, `review_by`, `sources`.

**Build checks (the build fails if any is true):**

- A required field is empty.
- A model is End-of-Sale without a replacement, or its replacement PID doesn't exist.
- A story links to a PID that isn't in the catalog.
- A datasheet or source link returns an error (run weekly, warn only).
- A featured story is past its `review_by` date.

**Editing workflow:** edit the spreadsheet or story file → run the build locally → push to GitHub. The Actions workflow runs the checks and publishes only if they pass. No visual editor is needed, since the owner is the only editor.

## Look and feel

Aim for a calm product-catalog look: Ubiquiti's product pages for structure, Apple's compare pages for comparison, and a changelog-style editorial layout for stories. Cisco-adjacent in colour and tone, but clearly not an official Cisco site.

| Reference | Borrow | Don't borrow |
| --- | --- | --- |
| [Ubiquiti store / tech specs](https://www.ui.com) | Clean product cards on white, specs in tabs, product photo first. Closest networking analogue. | Dense spec walls on first view |
| [Apple compare](https://www.apple.com/iphone/compare/) | Side-by-side columns, icons for yes/no, plain-language rows | Marketing-heavy hero imagery |
| [Linear changelog](https://linear.app/changelog) | Dated story cards, one image each, short teaser | Developer tone |
| [GSMArena compare](https://www.gsmarena.com/compare.php3) | Large spec sets compared at once, "differences only" idea | Its visual density and ads |
| [Hepsiburada](https://www.hepsiburada.com) / [Trendyol](https://www.trendyol.com) filters | Filter patterns Turkish users already know: left panel on desktop, bottom sheet on mobile, chips for active filters | Retail visual style |

**Design rules:**

- Palette: deep navy and a Cisco-like blue/teal accent, lots of white, one accent colour per screen. Don't copy Cisco's exact brand colours or the Cisco bridge logo.
- Brand: personal and unofficial. Cisco names appear only as product names. No Cisco logo or wordmark, and no Ingram Micro branding.
- Footer disclaimer (TR/EN): Cisco and related marks are trademarks of Cisco Systems; this is a personal, independent guide, not an official Cisco or Ingram Micro site. Verify part numbers against Cisco ordering guides before quoting.
- Type: one sans-serif with full Turkish glyph support (test ı, İ, ş, ğ in bold and italic). Body at least 16 px.
- Images: product photos only from Cisco's partner marketing assets or with confirmed rights. Same background and crop on every card.
- Design an original hero. The soft-landscape hero and struck-through title in your screenshot are ciscosizing.com's, so reusing them would read as a copy.
- Plain Turkish everywhere: short sentences, no untranslated jargon without a tooltip.

## Constraints

Mobile-first, fast on a phone, easy to edit, and legally safe in Turkey. Your three constraints stay; five more are needed.

| Constraint | Requirement |
| --- | --- |
| Mobile | Designed at 375 px first. Filters in a bottom sheet, comparison columns swipe with a pinned label column, tap targets at least 44 px. |
| External links | Open in a new tab with an external-link icon. Datasheets point to cisco.com. A weekly link check reports broken links. |
| Easy editing | Catalog in spreadsheets, stories in Markdown, no code changes needed for content (see Data model). |
| Performance | Largest content shown within 2.5 s on a mid-range phone over 4G. Images in WebP/AVIF, lazy-loaded. Video loads only on click. |
| Accessibility | WCAG 2.1 AA: keyboard use, visible focus, alt text in both languages, contrast checked. |
| Privacy (KVKK) | No tracking cookies by default. Contact form shows a KVKK notice (Aydınlatma Metni) and a consent checkbox. Web3Forms processes submissions outside Turkey, so the notice must say so. |
| Hosting | GitHub Pages at denizycode.github.io with HTTPS enforced. A custom domain is optional later. |
| No accounts | No login. The shortlist is kept in the browser and shared by link or export. |
| Contact form | Web3Forms free account. The access key sits in the page by design, so turn on its spam protection (honeypot or captcha) and check the free plan's monthly submission limit. |

## Out of scope

The site informs and shortlists; it never prices, quotes or orders.

- Pricing of any kind: list, net, discounts, incentives.
- Ordering, quoting, CCW estimates or deal registration.
- Stock, availability and lead times.
- Full configuration validation (power cords, modules, optics counts). The site points users to the contact form for a real BoM.
- User accounts and saved projects on a server.
- Live feeds from Cisco systems.
- Competitor crossovers (Huawei, Fortinet, HPE/Aruba to Cisco). LATER: a strong candidate for a second phase given how often these come up.

## Content rules and lessons learned

The mistakes we keep catching in partner BoMs are the ones the site must prevent: End-of-Sale models, under-powered PoE, missing licences and wrong management mode. Each becomes a data field and a visible warning, not a footnote.

1. **Lifecycle first.** Show an End-of-Sale badge with its date and a replacement link. The selector never returns an End-of-Sale model. Known waves to load at launch: Wi-Fi 6 indoor APs (Catalyst 9105/9115/9120/9130 and Meraki MR36/44/46) and Meraki MT sensors. Verify every date against the Cisco EoL bulletin and store its URL.
2. **Power for full function, not just "PoE".** For each AP, store the PoE standard needed for full function and what degrades below it (for example, the CW9176I needs 802.3bt for full function and drops features on 802.3at). The switch selector warns when the PoE budget is too small for the devices entered.
3. **Licences are part of the product.** Flag "Lisans gerekir" wherever a subscription is mandatory (Wi-Fi 7 APs, Catalyst switch subscriptions, Meraki). Describe tiers in plain words without prices.
4. **Licence-dependent performance.** Where throughput depends on the licence (for example, IPsec on the Catalyst 8000 secure routers), show both numbers and name the licence.
5. **Management mode is a choice that changes the PID.** Show Catalyst Center, Meraki dashboard and Cisco Business as a filter. Make clear that Catalyst 1200/1300 are not Meraki-managed, and that Meraki-mode Catalyst uses different PIDs.
6. **Turkey-specific notes.** 6 GHz availability depends on BTK rules; show a "Türkiye'de 6 GHz durumunu doğrulayın" note on Wi-Fi 6E/7 models until confirmed. Mention Law 5651 logging where guest Wi-Fi is involved.
7. **Every claim has a source and a date.** No spec, date or feature claim without a Cisco source URL and `last_verified`.
8. **Plain Turkish first.** Write for a reader with no Cisco background, then add the technical term in brackets.
9. **Reference site:** see the ciscosizing.com notes below.

### Reference site: ciscosizing.com

[ciscosizing.com](https://ciscosizing.com) is Yale Ohh's independent Meraki and Cisco sizing aid (v2.1.12, updated Oct 8 2026) and the closest existing tool to this one. The notes below come from the HTML of its home and Wireless pages (v2.1.13, Oct 9 2026).

What it does well (borrow the idea, not the code or assets):

- Short, stable family URLs (`/mr`, `/ms`, `/mx`, `/mg`, `/mv`). Use readable Turkish slugs instead, such as `/tr/kablosuz` and `/tr/anahtarlama`.
- Catalog search in the header of every page.
- Version number, "Updated" date and a Feedback page in the footer.
- A plain independence disclaimer plus "verify SKUs against Cisco ordering guides before quoting".
- A one-line description per family naming what you filter by: radios, mounting and use case for wireless; ports, PoE, stacking and licensing for switches.

Patterns on its Wireless page worth matching:

- Filters phrased as needs ("Power needed", "Deployment") with the technical term beside each option: "PoE+ · Class 4", "Wi-Fi 7 · 802.11be".
- Active-filter chips, each with an ×, plus "Clear all" and a live count ("2 of 27 models").
- Results grouped by series under collapsible bands with a model count. Each model is one row: icon, PID, badges (Outdoor, New, mGig) and a one-line summary ("Outdoor · Wi-Fi 7 · 4×4:4").
- Natural-language search with rotating example queries in the box ("Primary connection, 2 SIMs").
- A compare tray that stays docked at the bottom while you browse.
- Dark mode, a 404 page that lists the valid family pages, and a link from each family page to Cisco's product page.
- It uses Google Analytics; Cisco Partner Rehberi keeps cookieless GoatCounter instead.

Where Cisco Partner Rehberi differs: Turkish first, the enterprise portfolio beyond Meraki (routing, data center, collaboration, firewalls), a guided selector, and the stories hub.

**Risk:** it is a separate project covering some of the same families. Borrow interaction patterns only; never its code, images, wording or data, and keep a visual identity of your own so the two sites aren't confused.

## Old site review (SelectorTool)

The old site at [denizycode.github.io/SelectorTool](https://denizycode.github.io/SelectorTool/) has a sound core worth porting: per-family CSV data, a management toggle and a working configuration builder. Its weak spot is filter logic that parses free text at runtime, which hides models silently when the CSV wording drifts. Reviewed from `index.html`, `wireless.html`, `router.html`, `datacenter.html`, `shared.js` and `shared.css`; the CSV dataset (`data/legacy/`) was audited separately in `docs/Phase1_Dataset_Audit.xlsx`.

### Keep

- Shared chrome plus one page per family (`shared.js` / `shared.css`). Becomes shared components.
- Management toggle as the first filter: On-Prem / Cloud / Unified, and Nexus / SAN / Hyperfabric on Data Center, with the info box explaining unified licensing.
- Series → model → detail flow, with a datasheet link on every model.
- Configuration builder: module, line card and antenna pickers with slot limits and a live SKU string. Nothing in the new spec replaced it, so it carries over and feeds the shortlist.
- Router query inputs: "at least N ports of speed X, type Y, on WAN or LAN" (counting what module slots can add) and "at least N Mbps of firewall or advanced-security throughput".
- Device graphics sized by port count and rack units: cheap, readable, no image rights needed.
- GoatCounter analytics (cookieless) and the Web3Forms feedback widget with its honeypot and 3-second timing check.
- Disclaimer at the top and bottom of every page.

### Fix

| Issue | Where | Fix |
| --- | --- | --- |
| Port-count buckets skip 25–47 ports, so 28-, 32- and 36-port models vanish when any port filter is on. The "<8" button also includes 8. | Switching, `bucketPortCount` | Buckets ≤8 / 9–16 / 17–28 / 29–47 / 48+, or an "at least N ports" input |
| Mixed logic: Features require every selected value, other groups any. Antenna uses "every", so Internal + External returns nothing. | All pages, `*Passes` functions | One rule: OR within a group, AND across groups. Features become an explicit "must have" group. |
| Specs parsed from text at runtime. Uplink regex misses 1G in "1/2.5/5G"; PoE matches any text containing "at"; speeds split on any non-digit. | Wireless `uplinkTokens`, `poeSet`; DC `speedTokens` | Store normalized values in the data (`uplink_gbps: [1,2.5,5]`, `poe_full: bt`) and validate them at build |
| Exact matches on free text ("6E" vs "Wi-Fi 6E", "10Gbps") fail silently when spelling drifts. | Wireless Wi-Fi filter, switching uplink filter | Controlled vocabularies, build fails on unknown values |
| Management inferred from the Family or Supertype name ("meraki", "MX"). Meraki-mode Catalyst (-M) can land under On-Prem. | Switching and routing `mgmtPass` | Explicit multi-value `management` field |
| Lifecycle shown only on Wireless details; End-of-Sale models sit among current ones on every page. | All pages | Lifecycle on every model, badge, excluded from recommendations, "show older models" toggle |
| Language defaults to EN, isn't remembered or in the URL; CSV descriptions and notes are English only. | `shared.js` | TR default, language in the URL, per-field TR text |
| No search, comparison, shareable links or saved state; Reset is the only state control. | All pages | Spec features (search, compare, shortlist, URL state) |
| On phones the filter panel renders above the results, so models sit below a long scroll. Fixed 700 + 380 px grid. | `shared.css` | Results first, filters in a bottom sheet |
| Data cache-busting by a hand-edited `DATA_VER`. | All pages | Build step fingerprints data files |

### Recovered decisions

The lost internal discussion is replaced by these, restated by the owner:

1. Fix the dataset and the filter logic (table above; full dataset audit in Phase 1).
2. Keep the scope additions already agreed: hub and stories, Collaboration, Security, Cameras and Cellular.
3. Track lifecycle for every model.
4. Add new products and remove End-of-Sale ones on a fixed routine (see Data model).
5. Explain every family and series in plain words for non-technical readers, for example "C9200L: the SMB entry into the Catalyst switch portfolio".
6. Show a recommended model.

## Risks and open questions

The biggest risk is stale data, not code: six families plus stories is a lot to keep current for one presales engineer.

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Stale catalog or stories | A partner quotes an End-of-Sale model or repeats an outdated licensing claim | `last_verified` and `review_by` fields, build checks, a monthly review slot |
| Scope too wide for one maintainer | Six families at launch may never all reach good quality | Launch with 2–3 families done well; mark the rest "Yakında" |
| Brand and trademark | A Cisco logo, look-alike branding or "Cisco" in the site name makes it read as official | No Cisco logo; independence disclaimer in every footer |
| Image and video rights | Re-hosted Cisco media without permission | Partner marketing assets only; YouTube embeds for video |
| Selector gives wrong advice | Under-powered PoE or wrong licence leads to a failed deployment | Every recommendation shows its assumptions plus "Cisco iş ortağınıza doğrulatın" |
| KVKK | Contact data stored without a legal basis | Aydınlatma Metni, consent checkbox, and a note that Web3Forms processes data abroad |
| Translation quality | Literal Turkish reads as machine-made and loses trust | Native review of all UI text and the first stories |
| Confusion with ciscosizing.com | Two independent tools covering the same Meraki families invite comparison | Own visual identity; borrow patterns, never assets or data |

**Decisions and open questions:**

- [x] Cameras and Cellular: added as basic families (model list and lifecycle only).
- [x] Hosting: GitHub Pages at denizycode.github.io.
- [x] Branding: personal and unofficial; no approval process.
- [x] Editors: the owner only.
- [x] Contact form: Web3Forms free account.
- [x] Site name: Cisco Partner Rehberi.
- [x] Old site code and CSVs received; dataset audit done (docs/Phase1_Dataset_Audit.xlsx).
- [x] Old internal discussion: decisions re-added under Old site review.
- [x] ciscosizing.com: separate project, reviewed from its page HTML; patterns only, no reuse.

## Done when

Done means five Turkish users with little Cisco knowledge each complete four tasks on a phone, in Turkish, without help. "A good customer experience" becomes testable that way.

**Usability test (5 participants, phone, Turkish UI, no help):**

| Task | Pass if |
| --- | --- |
| "10 AP ve 8 kamera besleyecek 24 portlu bir switch bulun." | Picks a current model with enough PoE budget in under 3 minutes |
| "Bu iki erişim noktasını karşılaştırın, bir farkı söyleyin." | Names one correct difference |
| "Cisco'nun yeni bir özelliğini bulun ve ne işe yaradığını anlatın." | Explains one story in their own words |
| "Seçtiğiniz modelleri listeye ekleyip paylaşın." | Produces a shortlist link or PDF |

Launch requires at least 4 of 5 participants to pass every task.

**Technical checks:**

- [ ] Mobile Lighthouse scores of 90+ for performance and accessibility on hub, a family page and a story.
- [ ] Zero End-of-Sale models returned by any selector.
- [ ] 100% of models and UI strings have Turkish text.
- [ ] Zero broken internal links; external link report reviewed.
- [ ] Every featured story verified within the last 90 days and linked to a Cisco source.
- [ ] Search finds models typed without Turkish characters and by old PIDs.

## Build plan for Claude Code

Eight phases, each ending with a working site you can open. Build one family end to end before the others, so every pattern is proven once.

1. **Phase 0 — Setup.** Repo, `CLAUDE.md`, this spec as `docs/SPEC.md`, stack decision recorded, empty site deployed to GitHub Pages.
2. **Phase 1 — Data pipeline.** Spreadsheet format, conversion script, schema and build checks. Import the old SelectorTool CSVs, normalize them to the new schema, and run the dataset audit: End-of-Sale status, controlled vocabularies, missing Turkish text, series explainers and recommended picks.
3. **Phase 2 — Shell.** Design tokens, layout, TR/EN routing, hub page with family buttons and placeholder story cards.
4. **Phase 3 — Wireless end to end.** Family page, filters, guided selector, model detail, comparison, lifecycle badges, PoE warnings.
5. **Phase 4 — Remaining families.** Switching, Routing, Security, Data Center, Collaboration, reusing Phase 3 components, then basic Cameras and Cellular lists.
6. **Phase 5 — Stories.** Story pages, featured strip, video embeds, freshness rules, the five seed stories.
7. **Phase 6 — Search, shortlist, forms.** Global search, shortlist export, migration finder, request form, analytics.
8. **Phase 7 — QA and launch.** Technical checks, native Turkish review, usability test, disclaimer and KVKK text check, go live.

**Claude Code setup:** the repo's `CLAUDE.md`, `.claude/rules/`, `.claude/settings.json`, the `/phase` and `/data-audit` skills and the `spec-reviewer` subagent implement the rules in this spec. Change rules there, not here.
