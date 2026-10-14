import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { checkNotice, noticeMarkdown } from './kvkk-check.mjs';

const tr = JSON.parse(readFileSync('src/i18n/tr.json', 'utf8'));
const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8'));
const dict = { tr, en };
const read = (p) => readFileSync(`dist/${p}`, 'utf8');
const built = existsSync('dist/tr/aydinlatma-metni/index.html');
const opts = { skip: built ? false : 'dist/ is not built (npm run build)' };
const page = (lang) => ({
  notice: read(lang === 'tr' ? 'tr/aydinlatma-metni/index.html' : 'en/privacy-notice/index.html'),
  contact: read(lang === 'tr' ? 'tr/iletisim/index.html' : 'en/contact/index.html'),
  home: read(`${lang}/index.html`),
  dict: dict[lang],
  lang,
  services: ['Web3Forms', 'GoatCounter'],
});

test('the built notice, form and disclaimer carry every element, in both languages', opts, () => {
  for (const lang of ['tr', 'en']) assert.deepEqual(checkNotice(page(lang)), []);
});

test('a removed section, a missing service name or a missing consent box is reported', opts, () => {
  const p = page('tr');
  const noRetention = { ...p, notice: p.notice.replace(/Saklama süresi/g, 'Başka başlık') };
  assert.match(checkNotice(noRetention).join('\n'), /retention|Saklama süresi/);
  const noService = { ...p, notice: p.notice.replace(/GoatCounter/g, 'Sayaç') };
  assert.match(checkNotice(noService).join('\n'), /does not name GoatCounter/);
  const noBox = { ...p, contact: p.contact.replace(/id="c-consent"/, 'id="c-other"') };
  assert.match(checkNotice(noBox).join('\n'), /no required consent checkbox/);
  const noLink = { ...p, contact: p.contact.replace(/aydinlatma-metni/g, 'baska-sayfa') };
  assert.match(checkNotice(noLink).join('\n'), /does not link to the notice/);
  const noDisclaimer = { ...p, home: p.home.replace('bağımsız bir rehberdir', 'rehberdir') };
  assert.match(checkNotice(noDisclaimer).join('\n'), /disclaimer is not on the page/);
});

test('the text for the lawyer has every notice key once, in both languages', () => {
  const md = noticeMarkdown(tr, en, '2026-10-14');
  for (const key of Object.keys(tr).filter((k) => /^privacy\./.test(k))) assert.equal(md.split(`\`${key}\``).length - 1, 1, key);
  assert.match(md, /Veri sorumlusu/);
  assert.match(md, /Data controller|controller/i);
  assert.match(md, /Web3Forms/);
  assert.match(md, /GoatCounter/);
});
