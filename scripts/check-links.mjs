// External link report (SPEC "Constraints": a weekly link check reports broken links). Collects every http(s) address
// that a visitor can reach from the built dist/ (page links and the three JSON data files per language), checks each
// one over the network and writes a report.
//
//   ok          answered 2xx, or a redirect that ends on the same page
//   landing     redirected to a landing page (index.html): the address is dead in disguise; this fails the run
//   moved       redirected to another address (report only: update the data when it is permanent)
//   unverified  403/429/5xx, timeout or reset: Cisco and Meraki often block scripts, so a person must open it once
//   broken      404/410 or the host does not exist: this fails the run
//   unexpected  a host other than cisco.com / meraki.com / youtube: the site must not link anywhere else
//
// Usage: node scripts/check-links.mjs [--list] [--write=docs/Phase7_External_Links.md] [--only=text] [--concurrency=4]
// Run after `npm run build`. DIST_DIR=<folder> checks another folder. Exit 1 on a broken, landing-page or unexpected link.
import { readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.env.DIST_DIR ?? 'dist';
const args = process.argv.slice(2);
const flag = (name) => (args.find((a) => a.startsWith(`--${name}=`)) ?? '').slice(name.length + 3);
const listOnly = args.includes('--list');
const reportPath = flag('write');
const only = flag('only');
const concurrency = Number(flag('concurrency') || 4);

const ALLOWED = [/(^|\.)cisco\.com$/, /(^|\.)meraki\.com$/, /(^|\.)youtube(-nocookie)?\.com$/, /^youtu\.be$/];
// Addresses that are not links to other sites: XML namespaces, the site's own host, the analytics endpoint.
const IGNORED_HOSTS = [/(^|\.)w3\.org$/, /(^|\.)github\.io$/, /(^|\.)goatcounter\.com$/, /^api\.web3forms\.com$/, /(^|\.)schema\.org$/];

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'vendor') yield* files(path); // vendored scripts are served as they are, not links a visitor follows
    }
    else if (/\.(html|json)$/.test(entry.name)) yield path;
  }
}

/** Every address with the first file that carries it. */
function collect() {
  const found = new Map();
  const pattern = /https?:\/\/[^\s"'<>)\\]+/g;
  for (const file of files(DIST)) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      const url = match[0].replace(/&amp;/g, '&').replace(/[.,;:]+$/, '');
      if (!found.has(url)) found.set(url, file.slice(DIST.length + 1).replaceAll('\\', '/'));
    }
  }
  return found;
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Tools4Us-linkcheck',
  accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
  'accept-language': 'en',
};

const norm = (u) => {
  const x = new URL(u);
  return `${x.hostname}${x.pathname.replace(/\/$/, '')}`.toLowerCase();
};

async function attempt(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, { method, headers: HEADERS, redirect: 'follow', signal: controller.signal });
    return { status: res.status, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

async function check(url) {
  let last;
  for (const [method, wait] of [['HEAD', 0], ['GET', 1500]]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const res = await attempt(url, method);
      last = res;
      if (res.status >= 200 && res.status < 400) break;
      if (res.status === 404 || res.status === 410) {
        if (method === 'GET') break; // a HEAD 404 is retried once with GET: some servers answer HEAD badly
      }
    } catch (error) {
      last = { error: error.cause?.code ?? error.name ?? String(error) };
    }
  }
  if (last.error) {
    const dead = /ENOTFOUND|EAI_AGAIN/.test(last.error) && last.error === 'ENOTFOUND';
    return { result: dead ? 'broken' : 'unverified', note: last.error };
  }
  if (last.status === 404 || last.status === 410) return { result: 'broken', note: `HTTP ${last.status}` };
  if (last.status >= 400) return { result: 'unverified', note: `HTTP ${last.status}` };
  if (norm(last.finalUrl) !== norm(url)) {
    // A datasheet that redirects to a landing page (…/index.html or a bare site path) is a dead address in disguise.
    const was = new URL(url).pathname;
    const now = new URL(last.finalUrl).pathname;
    const isIndex = (p) => p === '/' || /\/index\.html$/.test(p);
    const landing = isIndex(now) && !isIndex(was);
    return { result: landing ? 'landing' : 'moved', note: last.finalUrl };
  }
  return { result: 'ok', note: `HTTP ${last.status}` };
}

const found = collect();
const rows = [];
for (const [url, file] of found) {
  const host = hostOf(url);
  if (!host || IGNORED_HOSTS.some((re) => re.test(host))) continue;
  if (only && !url.includes(only)) continue;
  rows.push({ url, file, host, allowed: ALLOWED.some((re) => re.test(host)) });
}
rows.sort((a, b) => a.url.localeCompare(b.url));

if (listOnly) {
  const hosts = {};
  for (const r of rows) hosts[r.host] = (hosts[r.host] ?? 0) + 1;
  console.log(`${rows.length} external addresses in ${DIST}/`);
  console.table(hosts);
  process.exit(0);
}

console.log(`checking ${rows.length} external addresses (concurrency ${concurrency})`);
let next = 0;
async function worker() {
  while (next < rows.length) {
    const row = rows[next++];
    if (!row.allowed) {
      Object.assign(row, { result: 'unexpected', note: `host ${row.host} is not cisco.com, meraki.com or YouTube` });
      continue;
    }
    Object.assign(row, await check(row.url));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const counts = {};
for (const r of rows) counts[r.result] = (counts[r.result] ?? 0) + 1;
const order = ['broken', 'landing', 'unexpected', 'moved', 'unverified', 'ok'];
const lines = [`# External link report`, '', `Checked ${new Date().toISOString().slice(0, 10)} against \`${DIST}/\`: ${rows.length} addresses. ` + order.filter((k) => counts[k]).map((k) => `${counts[k]} ${k}`).join(', ') + '.', ''];
for (const kind of order.slice(0, 5)) {
  const list = rows.filter((r) => r.result === kind);
  if (!list.length) continue;
  lines.push(`## ${kind[0].toUpperCase()}${kind.slice(1)} (${list.length})`, '');
  lines.push(kind === 'landing' ? 'The old address now lands on a general page, not on the document: find the current address on cisco.com and fix it in the catalog.' : kind === 'unverified' ? 'Open each once in a browser: Cisco and Meraki often refuse scripts.' : kind === 'moved' ? 'Redirected: update the address in the data when the move is permanent.' : '', '');
  lines.push('| Address | Result | Found in |', '| --- | --- | --- |');
  for (const r of list) lines.push(`| ${r.url} | ${r.note} | \`${r.file}\` |`);
  lines.push('');
}
const report = lines.join('\n');
console.log(report);
if (reportPath) writeFileSync(reportPath, report + '\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
const failed = (counts.broken ?? 0) + (counts.landing ?? 0) + (counts.unexpected ?? 0) > 0;
console.log(failed ? 'check:links FAILED (broken, landing-page or unexpected addresses)' : 'check:links passed (no broken address; review the moved and unverified ones)');
process.exit(failed ? 1 : 0);
