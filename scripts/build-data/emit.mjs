// Writes the published catalog as JSON for the site. Only rows that are ready and in scope are emitted;
// drafts and excluded rows never reach the site. The manifest holds a sha256 per file (the fingerprint).

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './catalog.mjs';
import { glossaryJson } from './glossary.mjs';
import { storiesJson } from './stories.mjs';

export const GENERATED_DIR = join(ROOT, 'src', 'data', 'generated');

const INTERNAL = /^(legacy_|needs_data$|__)/;
const published = (row) => row.status === 'ready' && row.scope !== 'excluded';

function clean(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (INTERNAL.test(key) || key === 'status' || key === 'scope') continue;
    if (value === null || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function buildFamilyJson(family, sheets) {
  const models = (sheets.models ?? []).filter(published).map(clean);
  const accessories = (sheets.accessories ?? []).filter(published).map(clean);
  const pids = new Set([...models, ...accessories].map((r) => r.pid));
  return {
    family,
    series: (sheets.series ?? []).filter(published).map(clean),
    models,
    accessories,
    compat: (sheets.compat ?? []).filter((c) => pids.has(c.accessory_pid) && pids.has(c.model_pid)).map(clean),
  };
}

export function emitCatalog(catalog, dir = GENERATED_DIR, glossaryTerms = [], stories = []) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const manifest = { files: {} };
  for (const [family, sheets] of Object.entries(catalog.families)) {
    const text = `${JSON.stringify(buildFamilyJson(family, sheets), null, 2)}\n`;
    writeFileSync(join(dir, `${family}.json`), text);
    manifest.files[`${family}.json`] = createHash('sha256').update(text).digest('hex');
  }
  const glossary = `${JSON.stringify(glossaryJson(glossaryTerms), null, 2)}
`;
  writeFileSync(join(dir, 'glossary.json'), glossary);
  manifest.files['glossary.json'] = createHash('sha256').update(glossary).digest('hex');
  const storyText = `${JSON.stringify(storiesJson(stories), null, 2)}
`;
  writeFileSync(join(dir, 'stories.json'), storyText);
  manifest.files['stories.json'] = createHash('sha256').update(storyText).digest('hex');
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
