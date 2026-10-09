// Maps every issue in docs/Phase1_Dataset_Audit.xlsx (Issues tab) to a disposition, using the real catalog.
//   Fixed    a rule checked the catalog and the problem is gone (evidence recorded).
//   Tracked  the data cannot be filled without inventing it; the rows are draft and the gap is listed.
//   Open     no rule proved a fix. Nothing is marked Fixed without a check.
// Writes docs/Phase1_Audit_Closure.md and .csv.   node scripts/build-data/audit-closure.mjs

import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { loadCatalog, ROOT } from './catalog.mjs';
import { FAMILY_MODEL_COLUMNS, sheetColumns } from './columns.mjs';

const FAMILY_BY_FILE = {
  'switching.csv': 'switching',
  'wireless-data.csv': 'wireless',
  'wireless-antenna-data.csv': 'wireless',
  'routers.csv': 'routing',
  'router-modules.csv': 'routing',
  'DC-data.csv': 'datacenter',
  'dc-modules-data.csv': 'datacenter',
};

export async function readAuditIssues(path = join(ROOT, 'docs', 'Phase1_Dataset_Audit.xlsx')) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.getWorksheet('Issues');
  const text = (c) => (c.value === null || c.value === undefined ? '' : typeof c.value === 'object' ? String(c.value.text ?? c.value.result ?? '') : String(c.value)).trim();
  const issues = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    issues.push({
      id: Number(text(row.getCell(1))),
      file: text(row.getCell(2)),
      csvRow: text(row.getCell(3)) ? Number(text(row.getCell(3))) : null,
      scope: text(row.getCell(4)),
      column: text(row.getCell(5)),
      severity: text(row.getCell(6)),
      category: text(row.getCell(7)),
      issue: text(row.getCell(8)),
      fix: text(row.getCell(9)),
    });
  });
  return issues;
}

export async function buildClosure() {
  const issues = await readAuditIssues();
  const { catalog, problems } = await loadCatalog();

  // legacy "file row N" -> catalog rows
  const byLegacy = new Map();
  const byPid = new Map();
  for (const [family, sheets] of Object.entries(catalog.families)) {
    for (const sheet of ['models', 'accessories']) {
      for (const row of sheets[sheet]) {
        byPid.set(row.pid, { family, sheet, row });
        const m = /^(.+?) row (\d+)$/.exec(row.legacy_source ?? '');
        if (m) {
          const key = `${m[1]}:${m[2]}`;
          byLegacy.set(key, [...(byLegacy.get(key) ?? []), { family, sheet, row }]);
        }
      }
    }
  }
  const rowsFor = (issue) => {
    if (issue.csvRow) {
      const found = byLegacy.get(`${issue.file}:${issue.csvRow}`);
      if (found) return found;
    }
    const tokens = issue.scope.split(/[\s,;/()]+/).filter(Boolean);
    return tokens.map((t) => byPid.get(t)).filter(Boolean);
  };
  const ok = (evidence) => ({ ok: true, kind: 'Fixed', evidence });
  const no = (evidence) => ({ ok: false, evidence });
  const tracked = (evidence) => ({ ok: true, kind: 'Tracked', evidence });
  const allDraft = (rows) => rows.length > 0 && rows.every((r) => r.row.status === 'draft');
  const switchingModels = catalog.families.switching.models;
  const wirelessAcc = catalog.families.wireless.accessories;

  const rules = [
    {
      name: 'Lifecycle columns exist',
      test: (i) => i.category === 'Schema' && /^No lifecycle column/.test(i.issue),
      run: (i) => {
        const family = FAMILY_BY_FILE[i.file];
        const sheet = /modules|antenna/.test(i.file) ? 'accessories' : 'models';
        const keys = sheetColumns(sheet, family).map((c) => c.key);
        const need = ['lifecycle', 'eos_announced', 'last_order', 'ldos', 'replacement_pid', 'eol_bulletin_url'];
        const missing = need.filter((k) => !keys.includes(k));
        const headerProblem = problems.some((p) => p.code === 'SHEET_MISSING_COLUMN' && p.message.includes(family));
        return missing.length || headerProblem ? no(`missing ${missing.join(', ')}`) : ok(`${family}.xlsx ${sheet} has the six lifecycle columns, validated on every build`);
      },
    },
    {
      name: 'Turkish, explainer, recommended and provenance columns exist',
      test: (i) => i.category === 'Schema' && /^No Turkish text/.test(i.issue),
      run: (i) => {
        const family = FAMILY_BY_FILE[i.file];
        const keys = sheetColumns('models', family).map((c) => c.key);
        const need = ['name_tr', 'summary_tr', 'good_for_tr', 'recommended', 'recommended_why_tr', 'added_date', 'last_verified', 'source_url'];
        const missing = need.filter((k) => !keys.includes(k));
        const series = sheetColumns('series', family).map((c) => c.key).includes('series_intro_tr');
        return missing.length || !series ? no(`missing ${missing.join(', ')}`) : ok(`${family}.xlsx has the columns and a series sheet with series_intro_tr; the Turkish content itself is tracked as draft gaps`);
      },
    },
    {
      name: 'Lifecycle set from the audit',
      test: (i) => i.category === 'Lifecycle' && i.csvRow,
      run: (i) => {
        const rows = rowsFor(i);
        if (!rows.length) return no('row not found in catalog');
        const expected = /Move to "Eski modeller"/.test(i.fix) ? 'eos' : /lifecycle=(eos_announced)/.exec(i.fix)?.[1];
        const date = /\b(\d{4}-\d{2}-\d{2})\b/.exec(i.issue)?.[1];
        const bad = rows.filter(({ row }) => row.lifecycle !== expected || row.last_order !== date || !(row.replacement_pid?.length || row.replacement_note || row.replacement_none) || !row.eol_bulletin_url);
        return bad.length
          ? no(`${bad.map((b) => b.row.pid).join(', ')} does not match ${expected} / ${date} with a replacement and bulletin`)
          : ok(`${rows.map((r) => r.row.pid).join(', ')}: ${expected}, last order ${date}, replacement and bulletin set`);
      },
    },
    {
      name: 'Port count is numeric',
      test: (i) => i.category === 'Filter logic' && /ports fall between/.test(i.issue),
      run: (i) => {
        const rows = rowsFor(i);
        return rows.length && rows.every((r) => typeof r.row.port_count === 'number') ? ok(`${rows[0].row.pid}: port_count = ${rows[0].row.port_count}`) : no('port_count missing');
      },
    },
    {
      name: 'Modular uplink speeds derived from modules',
      test: (i) => i.category === 'Filter logic' && /"Modular" never matches/.test(i.issue),
      run: () => {
        const modular = switchingModels.filter((m) => m.modular_uplinks);
        const empty = modular.filter((m) => !m.uplink_gbps?.length).map((m) => m.pid);
        return empty.length ? { ok: true, kind: 'Tracked', evidence: `${modular.length - empty.length} of ${modular.length} modular-uplink switches now have uplink_gbps; ${empty.join(', ')} have no supervisor or module data in the legacy files` } : ok(`all ${modular.length} modular-uplink switches have uplink_gbps`);
      },
    },
    {
      name: 'Uplink speeds separated from downlink (data center)',
      test: (i) => i.category === 'Filter logic' && /written into the downlink field/.test(i.issue),
      run: (i) => {
        const rows = rowsFor(i);
        const r = rows[0]?.row;
        // The old filter matched these leaves on the 100G downlink button because "40/100G uplink" sat in the downlink text.
        return r && r.downlink_gbps?.length && r.uplink_gbps?.includes(100) && !r.downlink_gbps.includes(100) ? ok(`${r.pid}: downlink ${r.downlink_gbps.join('/')}G, uplink ${r.uplink_gbps.join('/')}G (100G is uplink only)`) : no('100G still in downlink, or arrays empty');
      },
    },
    {
      name: 'SAN switches no longer match VXLAN/EVPN',
      test: (i) => i.category === 'Filter logic' && /\(no [^)]*VXLAN/.test(i.issue),
      run: (i) => {
        const r = rowsFor(i)[0]?.row;
        return r && !r.features.includes('vxlan') && !r.features.includes('evpn') ? ok(`${r.pid}: features [${r.features.join(', ')}] contain no vxlan or evpn`) : no('vxlan or evpn still present');
      },
    },
    {
      name: 'Router-module links are full https URLs',
      test: (i) => i.category === 'Data quality' && /has no https:\/\//.test(i.issue),
      run: (i) => {
        const r = rowsFor(i)[0]?.row;
        if (r?.datasheet_url?.startsWith('https://')) return ok(`${r.pid}: ${r.datasheet_url}`);
        // Some of these cells are empty in the legacy file: there is no link to repair, only one to find.
        if (r && r.datasheet_url === null && r.status === 'draft') return tracked(`${r.pid}: the legacy link cell is empty; needs a datasheet link (row is draft${r.scope === 'excluded' ? ' and excluded' : ''})`);
        return no('datasheet_url not https');
      },
    },
    {
      name: 'Antenna PIDs normalized (one PID per row, no "=" or "/")',
      test: (i) => i.file === 'wireless-antenna-data.csv' && i.category === 'Data quality' && /spare suffix|Two [^ ]+ or a spare/.test(i.issue),
      run: (i) => {
        const bad = wirelessAcc.filter((a) => /[=,/]/.test(a.pid));
        return bad.length ? no(`still odd: ${bad.map((a) => a.pid).join(', ')}`) : ok(`all ${wirelessAcc.length} antenna PIDs are clean single PIDs`);
      },
    },
    {
      name: 'Antenna continuation and blank rows folded or dropped',
      test: (i) => i.file === 'wireless-antenna-data.csv' && i.category === 'Data quality' && (/blank row|connector note split|of row \d+/i.test(i.issue) || /^blank/i.test(i.scope)),
      run: (i) => {
        const bad = wirelessAcc.filter((a) => !a.pid || /^Connectors/i.test(a.pid));
        if (bad.length) return no('a continuation row became a PID');
        const unique = new Set(wirelessAcc.map((a) => a.pid)).size === wirelessAcc.length;
        return unique ? ok('no blank or "Connectors:" PIDs; antenna PIDs are unique, continuation text sits in legacy_notes') : no('duplicate antenna PIDs');
      },
    },
    {
      name: 'IW9165 bands parsed',
      test: (i) => i.file === 'wireless-data.csv' && i.category === 'Filter logic' && /not parsed|never matches any band/.test(i.issue),
      run: (i) => {
        const rows = rowsFor(i);
        return rows.length && rows.every((r) => JSON.stringify(r.row.bands_ghz) === '[5,6]') ? ok(`${rows.map((r) => r.row.pid).join(', ')}: bands_ghz [5,6]`) : no('bands not [5,6]');
      },
    },
    {
      name: 'Cisco Business management is explicit',
      test: (i) => i.file === 'wireless-data.csv' && i.category === 'Filter logic' && /bucket/.test(i.issue),
      run: () => {
        const cbw = catalog.families.wireless.models.filter((m) => m.series === 'CBW');
        return cbw.length && cbw.every((m) => m.management.includes('cisco_business')) ? ok(`${cbw.map((m) => m.pid).join(', ')}: management includes cisco_business`) : no('CBW management missing');
      },
    },
    {
      name: 'Antennas for the optional-kit AP are offered',
      test: (i) => i.file === 'wireless-data.csv' && i.category === 'Consistency' && /optional kit/.test(i.issue),
      run: () => {
        const n = catalog.families.wireless.compat.filter((c) => c.model_pid === 'CW9179F').length;
        return n >= 7 ? ok(`${n} antennas are linked to CW9179F by exact compat rows`) : no(`only ${n} antennas linked`);
      },
    },
    {
      name: 'Compatibility is exact PID pairs',
      test: (i) => i.file === 'wireless-antenna-data.csv' && i.category === 'Filter logic' && /substring/.test(i.issue),
      run: () => {
        const mr46 = catalog.families.wireless.compat.filter((c) => c.model_pid === 'MR46');
        return mr46.length === 0 ? ok('compat rows hold exact PIDs (the validator rejects unknown ones); no antenna is linked to MR46 by substring') : no('MR46 has antennas by substring');
      },
    },
    {
      name: 'One compatibility table for router modules',
      test: (i) => i.file === 'routers.csv' && i.category === 'Consistency' && /stored twice/.test(i.issue),
      run: () => {
        const keys = FAMILY_MODEL_COLUMNS.routing.map((c) => c.key);
        return !keys.some((k) => /_types$/.test(k)) ? ok('routing models keep only slot counts; module fit lives only in the compat sheet') : no('type columns still in models');
      },
    },
    {
      name: 'Modules listed once, linked by compat',
      test: (i) => i.file === 'switching.csv' && i.category === 'Schema' && /module repeated/.test(i.issue),
      run: () => {
        const acc = catalog.families.switching.accessories;
        return new Set(acc.map((a) => a.pid)).size === acc.length ? ok(`${acc.length} accessories, one row per PID; fit is in ${catalog.families.switching.compat.length} compat pairs`) : no('duplicate accessory PIDs');
      },
    },
    {
      name: 'Missing data stays visible as draft',
      test: (i) => ['Missing data', 'Content', 'Verify'].includes(i.category),
      run: (i) => {
        const rows = rowsFor(i);
        return allDraft(rows) ? tracked(`${rows.length} row(s) (${rows.slice(0, 3).map((r) => r.row.pid).join(', ')}${rows.length > 3 ? ', ...' : ''}) are draft; the gap is counted by check:data and cannot reach the site`) : no('rows not located');
      },
    },
  ];

  const results = [];
  for (const issue of issues) {
    let disposition = 'Open';
    let rule = '';
    let evidence = 'No rule proved a fix.';
    for (const r of rules) {
      if (!r.test(issue)) continue;
      const out = r.run(issue);
      rule = r.name;
      if (out.ok) {
        disposition = out.kind;
        evidence = out.evidence;
      } else {
        evidence = `Rule "${r.name}" did not hold: ${out.evidence}`;
      }
      break;
    }
    results.push({ ...issue, disposition, rule, evidence });
  }
  return results;
}

function ranges(ids) {
  const sorted = [...ids].sort((a, b) => a - b);
  const out = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const id of [...sorted.slice(1), Infinity]) {
    if (id !== prev + 1) {
      out.push(start === prev ? `#${start}` : `#${start}-#${prev}`);
      start = id;
    }
    prev = id;
  }
  return out.join(', ');
}

export function renderClosure(results) {
  const by = (d) => results.filter((r) => r.disposition === d);
  const lines = [
    '# Phase 1: audit closure',
    '',
    `Generated by \`scripts/build-data/audit-closure.mjs\` from \`docs/Phase1_Dataset_Audit.xlsx\` (Issues tab) and the real catalog. ${results.length} issues.`,
    '',
    '- **Fixed**: a rule checked the catalog and the problem is gone. The check is in the script and `npm run test:data`.',
    '- **Tracked**: the data cannot be filled without inventing it. The rows stay `draft`, so they cannot reach the site, and `npm run check:data` counts the gap.',
    '- **Open**: no rule proved a fix. Nothing is marked Fixed without a check.',
    '',
    '| Disposition | Issues | High | Medium | Low |',
    '| --- | --- | --- | --- | --- |',
    ...['Fixed', 'Tracked', 'Open'].map((d) => {
      const list = by(d);
      const sev = (s) => list.filter((r) => r.severity === s).length;
      return `| ${d} | ${list.length} | ${sev('High')} | ${sev('Medium')} | ${sev('Low')} |`;
    }),
    `| **Total** | ${results.length} | ${results.filter((r) => r.severity === 'High').length} | ${results.filter((r) => r.severity === 'Medium').length} | ${results.filter((r) => r.severity === 'Low').length} |`,
    '',
    'To update the audit workbook, copy `Phase1_Audit_Closure.csv` (ID, disposition) into the Status column: Fixed -> Fixed; Tracked and Open stay Open until the data is supplied.',
    '',
    '## Fixed and Tracked, by rule',
    '',
  ];
  const rules = [...new Set(results.filter((r) => r.disposition !== 'Open').map((r) => r.rule))];
  for (const rule of rules) {
    const list = results.filter((r) => r.rule === rule && r.disposition !== 'Open');
    lines.push(`### ${rule} (${list[0].disposition}, ${list.length})`, '', `Issues ${ranges(list.map((r) => r.id))}.`, '', `Example evidence: ${list[0].evidence}`, '');
  }
  lines.push('## Open', '');
  const open = by('Open');
  const groups = new Map();
  for (const r of open) {
    const key = `${r.file} | ${r.category} | ${r.severity}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, list] of [...groups].sort()) {
    lines.push(`### ${key} (${list.length})`, '', `Issues ${ranges(list.map((r) => r.id))}.`, '', `${list[0].issue}`, '', `Planned fix per audit: ${list[0].fix}`, '', ...(list[0].evidence.startsWith('Rule') ? [`Why not closed: ${list[0].evidence}`, ''] : []));
  }
  return lines.join('\n');
}

export function renderCsv(results) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  return ['ID,Disposition,Rule,Evidence', ...results.map((r) => [r.id, r.disposition, esc(r.rule), esc(r.evidence)].join(','))].join('\n') + '\n';
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-data/audit-closure.mjs')) {
  const results = await buildClosure();
  writeFileSync(join(ROOT, 'docs', 'Phase1_Audit_Closure.md'), `${renderClosure(results)}\n`);
  writeFileSync(join(ROOT, 'docs', 'Phase1_Audit_Closure.csv'), renderCsv(results));
  const count = (d) => results.filter((r) => r.disposition === d).length;
  console.log(`Audit closure: ${count('Fixed')} Fixed, ${count('Tracked')} Tracked, ${count('Open')} Open (total ${results.length})`);
}
