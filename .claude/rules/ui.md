---
paths:
  - "src/**"
  - "public/**"
  - "content/**"
---

# UI and content rules

- Turkish first. Every visible string comes from the i18n files in TR and EN; no literal UI text in components. The language is in the URL (`/tr/...`, `/en/...`).
- Test Turkish characters (ı İ ş Ş ğ Ğ ç ö ü) in headings, bold, buttons and search. Search must match "kablosuz" to "Kablosuz" and "isik" to "ışık".
- Filters: OR within a group, AND across groups. Show active-filter chips with a live result count ("27 modelden 4'ü").
- Every recommendation shows its assumptions and "Cisco iş ortağınıza doğrulatın".
- End-of-Sale models: badge, last-order date, replacement link; never in selector results or the featured strip.
- Mobile first at 375 px: results above filters, filters in a bottom sheet, tap targets ≥ 44 px, comparison columns swipe with the label column pinned.
- Accessibility: WCAG 2.1 AA, keyboard reachable, visible focus, alt text in both languages.
- External links open in a new tab with an external-link icon. Video embeds load only on click (youtube-nocookie.com).
- Footer on every page: TR/EN disclaimer that this is a personal, independent guide, not an official Cisco or Ingram Micro site.
- Before saying a UI task is done, take screenshots at 375 px and 1280 px and check them.
