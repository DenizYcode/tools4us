// Turns published rows (one PID per row) into model cards, for every family. Pure functions, no Astro: the
// site, the selectors and the tests all use the same cards.
//
// Variants of one model (CW9176I-CFG and -RTG, CW9166I and CW9166I-MR) share a name_tr in the data. They must
// agree on everything that decides whether a card is shown or recommended (`same`). Switching and routing
// rows are one PID per model, so every card holds one PID.

const TR_FOLD = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ç: 'c', Ç: 'c', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u' };

/** URL slug: Turkish letters folded, lowercase, hyphens. "Cisco Wireless 9172I" -> "cisco-wireless-9172i". */
export function slugify(text) {
  return String(text)
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (c) => TR_FOLD[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * One card per model name. `spec.same` lists the fields the variants must share; `spec.extract(first, rows)`
 * adds the family-specific spec fields. Throws when variants disagree on a shared field.
 */
export function buildCards(models, spec) {
  const groups = new Map();
  for (const m of models) {
    const key = m.name_tr;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const cards = [];
  for (const [name, rows] of groups) {
    const first = rows[0];
    for (const row of rows) {
      for (const field of spec.same) {
        if (JSON.stringify(row[field] ?? null) !== JSON.stringify(first[field] ?? null)) {
          throw new Error(`Variants of "${name}" disagree on ${field}: ${first.pid}=${first[field]} but ${row.pid}=${row[field]}`);
        }
      }
    }
    const rec = rows.find((r) => r.recommended === true);
    const management = [...new Set(rows.flatMap((r) => r.management ?? []))];
    const pick = (field) => rows.map((r) => r[field]).find((v) => v !== undefined && v !== null && v !== '');
    cards.push({
      family: first.family,
      slug: slugify(name),
      name,
      series: first.series,
      pids: rows.map((r) => r.pid),
      variants: rows.map((r) => ({ pid: r.pid, sku_variant: r.sku_variant ?? null, management: r.management ?? [] })),
      lifecycle: first.lifecycle,
      eos_announced: first.eos_announced ?? null,
      last_order: first.last_order ?? null,
      ldos: first.ldos ?? null,
      replacement_pids: [...new Set(rows.flatMap((r) => r.replacement_pid ?? []))],
      replacement_note: pick('replacement_note') ?? null,
      replacement_none: first.replacement_none === true,
      eol_bulletin_url: pick('eol_bulletin_url') ?? null,
      features: first.features ?? [],
      management,
      // Unified = one orderable PID that can run both ways. Where cloud needs another PID (CW916x -MR) it is not unified.
      unified: rows.some((r) => (r.management ?? []).includes('on_prem') && (r.management ?? []).includes('cloud')),
      licence_required: first.licence_required ?? null,
      recommended: Boolean(rec),
      ...spec.extract(first, rows),
      text: {
        tr: {
          summary: first.summary_tr,
          good_for: first.good_for_tr,
          licence: pick('licence_note_tr') ?? null,
          poe_note: pick('poe_note_tr') ?? null,
          variant_note: pick('variant_note_tr') ?? null,
          replacement_note: pick('replacement_note') ?? null,
          recommended_why: rec?.recommended_why_tr ?? null,
        },
        en: {
          summary: first.summary_en ?? null,
          good_for: first.good_for_en ?? null,
          licence: pick('licence_note_en') ?? null,
          poe_note: pick('poe_note_en') ?? null,
          variant_note: pick('variant_note_en') ?? null,
          replacement_note: pick('replacement_note_en') ?? null,
          recommended_why: rec?.recommended_why_en ?? null,
        },
      },
      datasheet_url: first.datasheet_url,
      source_url: first.source_url,
      last_verified: first.last_verified,
    });
  }
  return cards;
}

/** Text in a language, falling back to Turkish (the default language) when the English text is empty. */
export function textOf(card, lang, field) {
  return card.text[lang]?.[field] ?? card.text.tr[field] ?? null;
}

/** A card shown in selectors, recommendations and the featured strip: current models only. */
export const isCurrent = (card) => card.lifecycle === 'current';

/**
 * Series for a family page. Series with at least one current model come first, then `seriesSort` (default: the
 * position in `order`, then name); series that only hold End-of-Sale models are last. Inside a series:
 * recommended, current, then `cardOrder`. `order` lists the series names in the order the page shows them.
 */
export function seriesBands(cards, seriesRows, { order = [], cardOrder = (a, b) => a.name.localeCompare(b.name), seriesSort } = {}) {
  const rank = (name) => {
    const i = order.indexOf(name);
    return i === -1 ? order.length : i;
  };
  const bySort = seriesSort ?? ((a, b) => rank(a.series) - rank(b.series) || a.series.localeCompare(b.series));
  const out = seriesRows.map((s) => {
    const own = cards.filter((c) => c.series === s.series);
    own.sort((a, b) => Number(b.recommended) - Number(a.recommended) || Number(isCurrent(b)) - Number(isCurrent(a)) || cardOrder(a, b));
    return { ...s, cards: own, hasCurrent: own.some(isCurrent) };
  });
  return out.filter((s) => s.cards.length > 0).sort((a, b) => Number(b.hasCurrent) - Number(a.hasCurrent) || bySort(a, b));
}

/** Map from every published PID to the card that holds it, for replacement links. */
export function cardByPid(cards) {
  const map = new Map();
  for (const c of cards) for (const pid of c.pids) map.set(pid, c);
  return map;
}

/** Replacement cards for an End-of-Sale card (deduplicated, in bulletin order). Each is a published, current card. */
export function replacementCards(card, lookup) {
  const seen = new Set();
  const out = [];
  for (const pid of card.replacement_pids) {
    const target = lookup.get(pid);
    if (target && !seen.has(target.slug)) {
      seen.add(target.slug);
      out.push(target);
    }
  }
  return out;
}
