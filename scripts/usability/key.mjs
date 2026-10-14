// Moderator answer key for the usability test (SPEC "Done when"), built from the published catalog so it never goes
// stale. The key is for the moderator only: never show it to a participant.
//   node scripts/usability/key.mjs     writes docs/Phase7_Usability_Key.md (run npm run build:data first)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRows } from '../../src/lib/compare.mjs';

// Task 1 assumptions, stated so the moderator can defend a verdict: 10 access points at about 30 W (Wi-Fi 6 class)
// and 8 cameras at about 15 W. The site's own selector uses a rougher rule (devices x watts per device).
export const AP_COUNT = 10;
export const AP_WATTS = 30;
export const CAMERA_COUNT = 8;
export const CAMERA_WATTS = 15;
export const NEED_W = AP_COUNT * AP_WATTS + CAMERA_COUNT * CAMERA_WATTS;

export const AP_PAIR = ['Cisco Wireless 9172I', 'Catalyst 9162I'];

const gen = (n) => String(n);
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** One representative row per model name, as the site shows one card per name. */
const byName = (models) => {
  const seen = new Map();
  for (const m of models) if (!seen.has(m.name_tr)) seen.set(m.name_tr, m);
  return [...seen.values()];
};

export function switchKey(models, needW = NEED_W) {
  const current = byName(models).filter((m) => m.lifecycle === 'current' && m.poe && m.port_count === 24);
  const row = (m) => `| ${m.name_tr} | ${m.pid} | ${m.poe_budget_w} W | ${(m.management ?? []).join(' / ')}${m.recommended ? ' | recommended' : ' |'}`;
  const enough = current.filter((m) => m.poe_budget_w >= needW).sort((a, b) => a.poe_budget_w - b.poe_budget_w || a.name_tr.localeCompare(b.name_tr));
  const short = current.filter((m) => m.poe_budget_w < needW).sort((a, b) => a.poe_budget_w - b.poe_budget_w || a.name_tr.localeCompare(b.name_tr));
  return { enough, short, rowOf: row };
}

/**
 * The site shows one card per model name, with the variants merged (the cloud variant adds "cloud" to the management
 * list). The key must compare those merged cards, not the first raw row, or it lists differences the site does not show.
 */
export function pairKey(models, names = AP_PAIR) {
  const cards = names.map((n) => {
    const name = [...new Set(models.map((x) => x.name_tr))].find((x) => x.includes(n));
    if (!name) throw new Error(`no published wireless model named like "${n}"`);
    const rows = models.filter((x) => x.name_tr === name);
    const first = rows[0];
    const pick = (field) => rows.map((r) => r[field]).find((v) => v !== undefined && v !== null && v !== '');
    return {
      ...first,
      name,
      management: [...new Set(rows.flatMap((r) => r.management ?? []))],
      features: first.features ?? [],
      poe_supported: first.poe_supported ?? [],
      licence: pick('licence_note_tr') ?? '',
      wifi_generation: gen(first.wifi_generation),
    };
  });
  // Same rows as the site's compare table; the end-of-life rows do not differ for two current models.
  const rows = buildRows(cards, 'wireless').filter((r) => r.differs && !['last_order', 'replaced_by'].includes(r.key));
  return { cards, rows };
}

// Rows whose difference is only wording: a participant who names one of these has not found a real difference.
export const WORDING_ONLY = { radio_config: 'wording only: check the two model pages; both are 2x2 with 2.4, 5 and 6 GHz radios, so "tri-radio" against "2.4 / 5 / 6 GHz" is the same hardware described two ways' };

export function markdown({ wireless, switching, stories, today = new Date().toISOString().slice(0, 10) }) {
  const { enough, short, rowOf } = switchKey(switching);
  const pair = pairKey(wireless);
  const l = [];
  l.push('# Usability test: moderator answer key', '', `**Moderator only. Never show this page to a participant.** Generated ${today} by \`npm run usability:key\` from the published catalog; run it again after any catalog change.`, '');
  l.push('## Task 1: 24-port switch for 10 access points and 8 cameras', '');
  l.push(`Assumption used to judge the answer: ${AP_COUNT} access points at about ${AP_WATTS} W plus ${CAMERA_COUNT} cameras at about ${CAMERA_WATTS} W = **${NEED_W} W** of PoE budget, and 18 PoE ports used. This figure is the key's own assumption (the SPEC says only "enough PoE budget"); change \`AP_WATTS\` and \`CAMERA_WATTS\` at the top of \`scripts/usability/key.mjs\` if you disagree and run \`npm run usability:key\` again. A model at exactly ${NEED_W} W has no margin: it passes, but a moderator may note it.`, '');
  l.push(`**Pass:** the participant names (or opens the page of) a **current** model with 24 ports and a PoE budget of at least ${NEED_W} W, in under 3 minutes. Any model in the first table passes. Score the model the participant **ends on**, however they got there.`, '');
  l.push(`### Passes (${enough.length} models)`, '', '| Model | Part number | PoE budget | Management | |', '| --- | --- | --- | --- | --- |', ...enough.map(rowOf), '');
  l.push(`### Fails: current 24-port PoE models with too small a budget (${short.length} models)`, '', `Choosing one of these is the mistake the site exists to prevent (PoE budget under ${NEED_W} W). Note whether the site warned the participant.`, '', '| Model | Part number | PoE budget | Management | |', '| --- | --- | --- | --- | --- |', ...short.map(rowOf), '');
  l.push('**If the participant followed the selector ("Bana model öner") and it returned a model from the fail table:** that is still an N for the task, and it is also a **site finding** to write down. The selector multiplies the number of PoE devices by the watts per device the participant picks; "Düşük (IP telefon, yaklaşık 15 W)" for cameras and access points gives 24 x 15 = 360 W, which several 370 W models satisfy. Record which option they picked and whether the wording of the question led them there.', '');
  l.push('Also a fail: an End-of-Sale model (the site should never offer one), a non-PoE switch, or a switch with fewer than 24 ports. Note how they found it (selector "Bana model öner", family page filters, search).', '');
  l.push('## Task 2: compare two access points', '');
  l.push(`The moderator hands over the two names on a card: **${pair.cards[0].name}** and **${pair.cards[1].name}**. They are on the Kablosuz (wireless) page; the participant may also use Karşılaştır or search.`, '');
  l.push('**Pass:** the participant names **one difference that is true**, in their own words. Differences the compare table shows (raw values, same rows and order as the site, variants merged):', '');
  const cell = (v) => ([].concat(v).join(', ') || 'none').replace(/\|/g, '/').slice(0, 140);
  l.push(`| Row | ${pair.cards[0].name} | ${pair.cards[1].name} |`, '| --- | --- | --- |', ...pair.rows.map((r) => `| ${r.key}${WORDING_ONLY[r.key] ? ' (wording only)' : ''} | ${cell(r.values[0])} | ${cell(r.values[1])} |`), '');
  for (const r of pair.rows) if (WORDING_ONLY[r.key]) l.push(`- **${r.key}:** ${WORDING_ONLY[r.key]}.`);
  l.push('');
  l.push('A difference that is not in the table can still be true (for example from the model pages): check it against the two model pages before failing the participant. A wrong statement, or no statement, is a fail.', '');
  l.push('## Task 3: find a new Cisco feature and explain it', '');
  l.push('**Pass:** the participant opens one story and explains **what it is and what it is for** in their own words (not by reading a line aloud). Accept any of the stories below. "What it is" is the story\'s own one-line description; "Why it matters" is what it means for a partner. A participant who can say the first in their own words passes; the second is a bonus.', '');
  l.push('| Story | What it is (key) | Why it matters (key) |', '| --- | --- | --- |', ...stories.map((s) => `| ${s.title.tr} | ${s.teaser.tr.replace(/\|/g, '/')} | ${s.why.tr.replace(/\|/g, '/')} |`), '');
  l.push('## Task 4: add models to the list and share it', '');
  l.push('Run this task last, with the models the participant picked in tasks 1 and 2 (if they picked none, ask them to add two models of their own choice first; that is not part of the pass).', '');
  l.push('**Pass:** the participant produces **a shortlist link or a PDF**: "Bağlantıyı kopyala" and then pastes or sends it (a message to the moderator, a note), or "Yazdır / PDF" and shows the print preview or the saved file. Opening the shortlist page alone is not a pass.', '');
  l.push('Note: the shortlist is kept in the browser. Use a **private tab** for each participant so the list starts empty.', '');
  return l.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const g = 'src/data/generated';
  const text = markdown({
    wireless: read(`${g}/wireless.json`).models,
    switching: read(`${g}/switching.json`).models,
    stories: read(`${g}/stories.json`).stories.filter((s) => s.featured || s.status !== 'draft'),
  });
  writeFileSync('docs/Phase7_Usability_Key.md', text);
  console.log('wrote docs/Phase7_Usability_Key.md');
}
