// SPEC build check: the Turkish and English UI string files must have the same keys.
// Carried over from the Phase 0 review (only a TypeScript type enforced it before).

import { readFileSync } from 'node:fs';

export function compareKeys(tr, en) {
  const trKeys = new Set(Object.keys(tr));
  const enKeys = new Set(Object.keys(en));
  return {
    missingInEn: [...trKeys].filter((k) => !enKeys.has(k)),
    missingInTr: [...enKeys].filter((k) => !trKeys.has(k)),
  };
}

export function checkI18nParity(trPath, enPath) {
  const tr = JSON.parse(readFileSync(trPath, 'utf8'));
  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const { missingInEn, missingInTr } = compareKeys(tr, en);
  const errors = [];
  for (const key of missingInEn) errors.push({ code: 'I18N_MISSING_EN', message: `src/i18n/en.json is missing "${key}"` });
  for (const key of missingInTr) errors.push({ code: 'I18N_MISSING_TR', message: `src/i18n/tr.json is missing "${key}"` });
  for (const [lang, dict] of [['tr', tr], ['en', en]]) {
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push({ code: 'I18N_EMPTY', message: `src/i18n/${lang}.json: "${key}" is empty` });
      }
    }
  }
  return errors;
}
