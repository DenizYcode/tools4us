// Turns published wireless rows (one PID per row) into model cards (one card per model, variants inside).
// Pure functions, no Astro: the site, the selector and the tests all use the same cards.
//
// Variants of one model (CW9176I-CFG and -RTG, CW9166I and CW9166I-MR, IW9167EH-E-AP and -URWB) share a
// name_tr in the data. They must agree on everything that decides whether a card is shown or recommended.

export const POE_RANK = { af: 1, at: 2, bt: 3 };

const TR_FOLD = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ç: 'c', Ç: 'c', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u' };

/** URL slug: Turkish letters folded, lowercase, hyphens. "Cisco Wireless 9172I" -> "cisco-wireless-9172i". */
export function slugify(text) {
  return String(text)
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (c) => TR_FOLD[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SAME = ['series', 'lifecycle', 'environment', 'wifi_generation', 'poe_full', 'last_order'];

/** One card per model name. Throws when variants disagree on a field that must be shared. */
export function groupCards(models) {
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
      for (const field of SAME) {
        if (JSON.stringify(row[field] ?? null) !== JSON.stringify(first[field] ?? null)) {
          throw new Error(`Variants of "${name}" disagree on ${field}: ${first.pid}=${first[field]} but ${row.pid}=${row[field]}`);
        }
      }
    }
    const rec = rows.find((r) => r.recommended === true);
    const management = [...new Set(rows.flatMap((r) => r.management ?? []))];
    const pick = (field) => rows.map((r) => r[field]).find((v) => v !== undefined && v !== null && v !== '');
    cards.push({
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
      eol_bulletin_url: pick('eol_bulletin_url') ?? null,
      wifi_generation: first.wifi_generation,
      environment: first.environment,
      bands_ghz: first.bands_ghz ?? [],
      spatial_streams: first.spatial_streams ?? null,
      radio_config: first.radio_config ?? null,
      antenna_type: first.antenna_type ?? null,
      uplink_max_gbps: first.uplink_max_gbps ?? null,
      uplink_mgig: first.uplink_mgig === true,
      port_count: first.port_count ?? null,
      poe_supported: first.poe_supported ?? [],
      poe_full: first.poe_full,
      wall_plate: first.wall_plate === true,
      rugged: first.rugged === true,
      features: first.features ?? [],
      management,
      unified: management.includes('on_prem') && management.includes('cloud'),
      recommended: Boolean(rec),
      text: {
        tr: {
          summary: first.summary_tr,
          good_for: first.good_for_tr,
          licence: pick('licence_note_tr') ?? null,
          poe_note: pick('poe_note_tr') ?? null,
          variant_note: pick('variant_note_tr') ?? null,
          recommended_why: rec?.recommended_why_tr ?? null,
        },
        en: {
          summary: first.summary_en ?? null,
          good_for: first.good_for_en ?? null,
          licence: pick('licence_note_en') ?? null,
          poe_note: pick('poe_note_en') ?? null,
          variant_note: pick('variant_note_en') ?? null,
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

/** True when the 6 GHz band is part of the model: the Turkey note applies. */
export const hasSixGhz = (card) => card.bands_ghz.includes(6);

/**
 * Series for the family page. Series with at least one current model come first (newest Wi-Fi generation, then
 * name); series that only hold End-of-Sale models are last. Inside a series: recommended, current, then older.
 */
export function bySeries(cards, seriesRows) {
  const genRank = { 7: 3, '6e': 2, 6: 1 };
  const out = seriesRows.map((s) => {
    const own = cards.filter((c) => c.series === s.series);
    own.sort((a, b) => Number(b.recommended) - Number(a.recommended) || Number(isCurrent(b)) - Number(isCurrent(a)) || (genRank[b.wifi_generation] ?? 0) - (genRank[a.wifi_generation] ?? 0) || a.name.localeCompare(b.name));
    return { ...s, cards: own, hasCurrent: own.some(isCurrent), gen: Math.max(0, ...own.map((c) => genRank[c.wifi_generation] ?? 0)) };
  });
  return out
    .filter((s) => s.cards.length > 0)
    .sort((a, b) => Number(b.hasCurrent) - Number(a.hasCurrent) || b.gen - a.gen || a.series.localeCompare(b.series));
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
