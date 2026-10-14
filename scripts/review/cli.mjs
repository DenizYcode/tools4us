// Turkish review kit.
//   node scripts/review/cli.mjs export [--out=docs/Phase7_Turkish_Review.xlsx] [--area=Stories]
//       Writes every Turkish text a visitor reads, next to its English twin, for a native speaker to correct.
//   node scripts/review/cli.mjs apply <reviewed.xlsx> [--write] [--force]
//       Reads the corrections. Without --write it only reports what would change.
// After `apply --write`: npm run check:data, npm run build, npm run test:data, then read `git diff`.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { ROOT } from '../build-data/catalog.mjs';
import { applyChanges, collect } from './lib.mjs';

const [command, ...rest] = process.argv.slice(2);
const flag = (name) => (rest.find((a) => a.startsWith(`--${name}=`)) ?? '').slice(name.length + 3);
const has = (name) => rest.includes(`--${name}`);

const cellText = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('');
  if (typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v);
};

const COLUMNS = [
  ['id', 9],
  ['area', 18],
  ['section', 22],
  ['where', 34],
  ['used_by', 9],
  ['examples', 22],
  ['english', 55],
  ['turkish_current', 55],
  ['turkish_suggested', 55],
  ['status', 14],
  ['note', 36],
  ['target', 12],
];

const README = [
  ['Türkçe inceleme dosyası / Turkish review file', ''],
  ['', ''],
  ['Ne yapacaksınız?', 'Sitede ziyaretçilerin okuduğu bütün Türkçe metinler "Review" sayfasında. Her satırda İngilizcesi (english) ve şimdiki Türkçesi (turkish_current) var. Düzeltmek istediğiniz satırda, yalnızca "turkish_suggested" sütununa yeni metnin tamamını yazın. Satır doğruysa boş bırakın.'],
  ['What to do', 'Every Turkish text a visitor reads is on the "Review" sheet, next to its English twin. Where you want a change, write the complete new text in "turkish_suggested" only. Leave it empty if the text is fine.'],
  ['', ''],
  ['status sütunu', 'İsteğe bağlı. "soru" yazarsanız satır uygulanmaz, notunuzu "note" sütununa yazın. "atla" da uygulanmaz. Boş ya da "tamam" olan ve önerisi olmayan satır değişmez.'],
  ['Sıra', 'Sayfa, en çok görülen metinden en az görülene doğru sıralı: arayüz, KVKK ve form, haberler, sözlük, seri açıklamaları, model metinleri. Zamanınız azsa baştan başlayın.'],
  ['used_by', 'Aynı metin kaç modelde kullanılıyor. Örneğin 40 yazıyorsa, tek düzeltme 40 modele birden uygulanır. (examples: ilk üç model.)'],
  ['', ''],
  ['Yazım kuralları', '1) Sade Türkçe, kısa cümleler; teknik olmayan okuyucu için yazın. 2) Teknik terim gerekiyorsa Türkçesinin yanına parantez içinde verin: "Erişim noktası (access point)". 3) {name}, {n}, {shown} gibi süslü parantezli parçalara dokunmayın, aynen kalmalı; yeri değişebilir. 4) **kalın** işaretlerini ve [bağlantı](adres) biçimini koruyun; adres değişmemeli. 5) Ürün adlarını (Catalyst 9300, Meraki MR57) çevirmeyin. 6) Fiyat, sipariş ya da stok ifadesi eklemeyin.'],
  ['Rules', '1) Plain Turkish, short sentences. 2) Technical term in brackets after the Turkish word. 3) Do not change {placeholders}; they may move. 4) Keep **bold** marks and [link](address) form; the address must not change. 5) Do not translate product names. 6) Add no price, ordering or stock wording.'],
  ['', ''],
  ['Değiştirmeyin', 'A–H ve L sütunları (L gizli, düzeltmenin nereye yazılacağını bilir). Bunlardan biri değişirse o satır uygulanmaz.'],
  ['Hukuk', '"KVKK ve form" ve "Footer disclaimer" satırlarını bir avukat da okumalı; dil düzeltmesi hukuki içeriği değiştirmemeli.'],
  ['', ''],
  ['Geri verme', 'Dosyayı kaydedip Denis\'e gönderin. Uygulama: npm run review:apply -- <dosya.xlsx> (önce deneme, sonra --write).'],
];

async function exportSheet() {
  const out = resolve(ROOT, flag('out') || 'docs/Phase7_Turkish_Review.xlsx');
  const area = flag('area');
  const items = (await collect()).filter((i) => !area || i.area.toLowerCase().includes(area.toLowerCase()));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'tools4us';
  const readme = wb.addWorksheet('Read me');
  readme.getColumn(1).width = 26;
  readme.getColumn(2).width = 120;
  README.forEach(([a, b], i) => {
    const row = readme.addRow([a, b]);
    row.alignment = { vertical: 'top', wrapText: true };
    row.getCell(1).font = { bold: true, size: i === 0 ? 14 : 11 };
  });

  const ws = wb.addWorksheet('Review', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  ws.columns = COLUMNS.map(([key, width]) => ({ header: key, key, width }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF7' } };
  for (const i of items) {
    const row = ws.addRow({ id: i.id, area: i.area, section: i.section, where: i.where, used_by: i.usedBy, examples: i.examples, english: i.english, turkish_current: i.turkish, turkish_suggested: '', status: '', note: '', target: JSON.stringify(i.target) });
    row.alignment = { vertical: 'top', wrapText: true };
  }
  ws.getColumn('turkish_suggested').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8D6' } };
  ws.getColumn('target').hidden = true;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  for (let r = 2; r <= items.length + 1; r++) ws.getCell(`J${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"tamam,değişiklik,soru,atla"'] };

  mkdirSync(dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  const byArea = {};
  for (const i of items) byArea[i.area] = (byArea[i.area] ?? 0) + 1;
  console.log(`wrote ${items.length} rows to ${out}`);
  console.table(byArea);
}

async function applySheet() {
  const file = rest.find((a) => !a.startsWith('--'));
  if (!file || !existsSync(file)) {
    console.error('Usage: node scripts/review/cli.mjs apply <reviewed.xlsx> [--write] [--force]');
    process.exit(2);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet('Review');
  if (!ws) throw new Error('the file has no "Review" sheet');
  const header = new Map();
  ws.getRow(1).eachCell((c, n) => header.set(cellText(c.value), n));
  for (const [name] of COLUMNS) if (!header.has(name)) throw new Error(`column "${name}" is missing: use the file made by the export`);
  const rows = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const get = (name) => cellText(row.getCell(header.get(name)).value);
    let target;
    try {
      target = JSON.parse(get('target'));
    } catch {
      return;
    }
    rows.push({ id: get('id'), target, turkish: get('turkish_current'), suggested: get('turkish_suggested'), status: get('status'), note: get('note') });
  });
  const result = await applyChanges(rows, { write: has('write'), force: has('force') });
  console.log(`${rows.length} rows read, ${result.applied.length} corrections ${has('write') ? 'written' : 'ready (dry run: add --write to apply)'}, ${result.skipped.length} not applied`);
  if (result.files.length) console.log(`files: ${result.files.join(', ')}`);
  for (const s of result.skipped) console.log(`  not applied ${s.id}: ${s.reason}`);
  const questions = rows.filter((r) => /^(soru|question)/i.test(r.status));
  if (questions.length) {
    console.log(`\n${questions.length} question(s) from the reviewer:`);
    for (const q of questions) console.log(`  ${q.id}: ${q.note || '(no note)'}`);
  }
  if (has('write') && result.applied.length) console.log('\nNext: npm run check:data && npm run build && npm run test:data, then read git diff.');
}

if (command === 'export') await exportSheet();
else if (command === 'apply') await applySheet();
else {
  console.error('Usage: node scripts/review/cli.mjs <export|apply> ...');
  process.exit(2);
}
