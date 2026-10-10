// Re-saves every catalog workbook with the current column specs, keeping all row data. Run it after a
// column is added to columns.mjs, so the owner's workbooks gain the new (empty) columns without a
// re-migration. Rows are read and written back unchanged.

import { FAMILIES, workbookPath } from '../catalog.mjs';
import { readWorkbook, writeWorkbook } from '../xlsx-io.mjs';

for (const family of FAMILIES) {
  const path = workbookPath(family);
  const { sheets } = await readWorkbook(path, family);
  await writeWorkbook(path, family, sheets);
  console.log(`${family}.xlsx re-saved (${sheets.models.length} models)`);
}
