// Phase 7: the Z3 and Z3C datasheet_url (meraki.cisco.com/product-collateral/z-series-datasheet/?file) now redirects to a
// Cisco corporate landing page (found by `npm run check:links`, 14 Oct 2026). The owner chose the Z-Series Teleworker
// Gateways page of the Meraki documentation instead. Only datasheet_url changes; no spec is touched, so last_verified
// stays. Idempotent: running it again changes nothing.

import { workbookPath } from '../catalog.mjs';
import { readWorkbook, writeWorkbook } from '../xlsx-io.mjs';

const OLD = 'https://meraki.cisco.com/product-collateral/z-series-datasheet/?file';
const NEW = 'https://documentation.meraki.com/SASE_and_SD-WAN/Z-Series_Teleworker_Gateways';

const path = workbookPath('routing');
const { sheets } = await readWorkbook(path, 'routing');
let changed = 0;
for (const row of sheets.models) {
  if (!['Z3', 'Z3C'].includes(row.pid)) continue;
  if (row.datasheet_url === NEW) continue;
  if (row.datasheet_url !== OLD) throw new Error(`${row.pid}: unexpected datasheet_url ${row.datasheet_url}`);
  row.datasheet_url = NEW;
  changed += 1;
}
if (changed) await writeWorkbook(path, 'routing', sheets);
console.log(`routing.xlsx: ${changed} datasheet_url changed (Z3, Z3C)`);
