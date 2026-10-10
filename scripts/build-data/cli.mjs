// CLI: node scripts/build-data/cli.mjs <check|build>
//   check  validate everything, exit 1 on any error
//   build  validate, then write src/data/generated/*.json

import { runCheck } from './index.mjs';
import { emitCatalog } from './emit.mjs';

const command = process.argv[2];
if (command !== 'check' && command !== 'build') {
  console.error('Usage: node scripts/build-data/cli.mjs <check|build>');
  process.exit(2);
}

const { catalog, glossary, errors } = await runCheck();
if (errors.length) process.exit(1);
if (command === 'build') {
  const manifest = emitCatalog(catalog, undefined, glossary);
  console.log(`build:data wrote ${Object.keys(manifest.files).length} file(s) to src/data/generated/`);
}
