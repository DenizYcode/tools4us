// Validation entry point used by cli.mjs.

import { join } from 'node:path';
import { loadCatalog, ROOT } from './catalog.mjs';
import { validateCatalog } from './validate.mjs';
import { checkI18nParity } from './i18n-parity.mjs';
import { readGlossary, validateGlossary } from './glossary.mjs';

const MAX_LISTED = 40;

function listFindings(title, findings) {
  if (!findings.length) return;
  console.log(`\n${title} (${findings.length})`);
  for (const f of findings.slice(0, MAX_LISTED)) console.log(`  [${f.code}] ${f.message}`);
  if (findings.length > MAX_LISTED) console.log(`  ... and ${findings.length - MAX_LISTED} more`);
}

function printStats(stats) {
  console.log('\nCatalog summary (rows per workbook)');
  for (const [family, s] of Object.entries(stats)) {
    const m = s.models;
    const a = s.accessories;
    const life = Object.entries(s.lifecycle).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
    console.log(`  ${family.padEnd(10)} models: ${m.ready} ready, ${m.draft} draft, ${m.excluded} excluded | accessories: ${a.ready} ready, ${a.draft} draft, ${a.excluded} excluded`);
    console.log(`  ${''.padEnd(10)} lifecycle (in scope): ${life}`);
  }
  const gaps = {};
  for (const s of Object.values(stats)) for (const [k, v] of Object.entries(s.draftGaps)) gaps[k] = (gaps[k] ?? 0) + v;
  const top = Object.entries(gaps).sort((x, y) => y[1] - x[1]).slice(0, 8);
  if (top.length) {
    console.log('\nWhat draft rows still lack (required fields, rows affected)');
    for (const [k, v] of top) console.log(`  ${k}: ${v}`);
  }
}

export async function runCheck() {
  const { catalog, problems } = await loadCatalog();
  const result = validateCatalog(catalog);
  const parity = checkI18nParity(join(ROOT, 'src', 'i18n', 'tr.json'), join(ROOT, 'src', 'i18n', 'en.json'));

  const glossary = await readGlossary();
  const glossaryErrors = [...glossary.problems.filter((p) => p.level === 'error'), ...validateGlossary(glossary.terms)];

  const errors = [...problems.filter((p) => p.level === 'error'), ...result.errors, ...parity, ...glossaryErrors];
  const warnings = [...problems.filter((p) => p.level === 'warning'), ...result.warnings];

  printStats(result.stats);
  listFindings('Warnings', warnings);
  listFindings('Errors', errors);
  console.log(errors.length ? `\ncheck:data FAILED with ${errors.length} error(s)` : `\ncheck:data passed (${warnings.length} warning(s))`);
  return { catalog, glossary: glossary.terms, errors, warnings };
}
