import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOCAB } from './vocab.mjs';
import { readWorkbook } from './xlsx-io.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CATALOG_DIR = join(ROOT, 'data', 'catalog');
export const FAMILIES = VOCAB.family;

export const workbookPath = (family, dir = CATALOG_DIR) => join(dir, `${family}.xlsx`);

// Reads every family workbook. Returns { catalog, problems } where problems are structural findings.
export async function loadCatalog(dir = CATALOG_DIR) {
  const catalog = { families: {} };
  const problems = [];
  for (const family of FAMILIES) {
    const path = workbookPath(family, dir);
    if (!existsSync(path)) {
      problems.push({ level: 'error', code: 'WORKBOOK_MISSING', message: `data/catalog/${family}.xlsx does not exist` });
      continue;
    }
    const { sheets, problems: p } = await readWorkbook(path, family);
    catalog.families[family] = sheets;
    problems.push(...p);
  }
  return { catalog, problems };
}
