// Row builders and the context object shared by the family mappers.

import { clean, fixUrl, featureTokens, slug } from './lib.mjs';

export function createContext() {
  return {
    decisions: [], // { family, topic, detail } for the needs-decision report
    features: {}, // family -> Map(slug -> { label, count })
  };
}

export function decide(ctx, family, topic, detail) {
  ctx.decisions.push({ family, topic, detail });
}

// Collects feature tokens for the vocabulary and returns the row's slugs.
export function recordFeatures(ctx, family, text) {
  const map = (ctx.features[family] ??= new Map());
  const slugs = [];
  for (const token of featureTokens(text)) {
    // "MACsec (Silicon One G200)" -> keep the leading word group; the full wording stays in legacy_features.
    const label = token.replace(/\s*\(.*$/, '').trim() || token;
    const key = slug(label);
    if (!key) continue;
    const entry = map.get(key) ?? { label, count: 0 };
    entry.count += 1;
    map.set(key, entry);
    slugs.push(key);
  }
  return [...new Set(slugs)];
}

export function datasheet(ctx, family, sourceTag, text) {
  const { url, bad } = fixUrl(text);
  if (bad) decide(ctx, family, 'Unusable datasheet link', `${sourceTag}: "${bad}" is not a usable URL; left empty.`);
  return url;
}

export function modelBase({ family, pid, series, source, name, management, datasheetUrl, description, notes, features }) {
  return {
    pid,
    family,
    series,
    status: 'draft',
    scope: 'in',
    name_tr: name,
    name_en: name,
    management,
    datasheet_url: datasheetUrl,
    legacy_source: source,
    legacy_description: clean(description),
    legacy_notes: clean(notes),
    legacy_features: clean(features),
  };
}

export function accessoryBase({ family, pid, kind, source, name, datasheetUrl, description, notes }) {
  return {
    pid,
    family,
    kind,
    status: 'draft',
    scope: 'in',
    name_tr: name,
    name_en: name,
    datasheet_url: datasheetUrl,
    legacy_source: source,
    legacy_description: clean(description),
    legacy_notes: clean(notes),
  };
}

export const seriesRow = (family, series) => ({ family, series, status: 'draft', scope: 'in' });
