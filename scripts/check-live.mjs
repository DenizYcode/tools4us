// Live-site check: fetches the deployed site and applies the checks that do not need a browser. Run it after a deploy
// (Actions run green). It cannot test the two things that need the real services: a GoatCounter page view and a Web3Forms
// message (docs/Phase7_Live_Checks.md).
//   node scripts/check-live.mjs [--site=https://denizycode.github.io/tools4us] [--sample=40]
// Exit 1 on a failed check.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import config from '../astro.config.mjs';
import { SITE_CONFIG, TO_FILL } from '../src/lib/site-config.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const site = flag('site', `${config.site}${config.base}`.replace(/\/$/, ''));
const sample = Number(flag('sample', 40));
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const get = async (path, opts = {}) => {
  const res = await fetch(`${site}/${path}`, { redirect: 'follow', headers: { 'user-agent': 'Tools4Us-livecheck' }, ...opts });
  return { status: res.status, type: res.headers.get('content-type') ?? '', text: opts.binary ? '' : await res.text(), bytes: opts.binary ? Buffer.from(await res.arrayBuffer()) : null };
};
const head = (html, re) => html.match(re)?.[1];

// 1. The new build is live: robots, sitemap, icons, preview image.
const robots = await get('robots.txt');
check('robots.txt answers 200 and names the sitemap', robots.status === 200 && robots.text.includes(`Sitemap: ${site}/sitemap.xml`), `status ${robots.status}`);
const sitemap = await get('sitemap.xml');
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check('sitemap.xml lists the indexable pages', sitemap.status === 200 && locs.length > 500, `${locs.length} addresses`);
check('sitemap holds no noindex tool page and no 404', !locs.some((l) => /\/(ara|search|seclimlerim|shortlist|karsilastir|compare)\/$/.test(l) || l.includes('404')));
for (const [file, type] of [['favicon.svg', 'svg'], ['apple-touch-icon.png', 'png'], ['social-preview.png', 'png']]) {
  const r = await get(file, { binary: true });
  const ok = r.status === 200 && r.type.includes(type) && (type === 'svg' || r.bytes.subarray(1, 4).toString() === 'PNG');
  check(`${file} is served`, ok, `status ${r.status} ${r.type}`);
  if (file === 'social-preview.png' && ok) check('social-preview.png is 1200 x 630', r.bytes.readUInt32BE(16) === 1200 && r.bytes.readUInt32BE(20) === 630);
}

// 2. Head tags on pages of every kind.
const pages = [
  ['tr/', true], ['en/', true], ['tr/kablosuz/', true], ['tr/anahtarlama/', true], ['tr/yonlendirme/', true],
  ['tr/kablosuz/cisco-wireless-9172i/', true], ['tr/anahtarlama/c9300-48p/', true], ['tr/yenilikler/birlesik-lisans/', true],
  ['en/stories/unified-licensing/', true], ['tr/iletisim/', true], ['tr/aydinlatma-metni/', true], ['en/privacy-notice/', true],
  ['tr/ara/', false], ['tr/seclimlerim/', false], ['tr/karsilastir/', false], ['en/shortlist/', false],
];
for (const [path, indexable] of pages) {
  const r = await get(path);
  const html = r.text;
  const canonical = head(html, /<link rel="canonical" href="([^"]+)"/);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const description = head(html, /<meta name="description" content="([^"]*)"/) ?? '';
  const ok = r.status === 200 && canonical === `${site}/${path}` && noindex === !indexable && description.length >= 20 && /<meta property="og:image" content="[^"]+social-preview\.png"/.test(html) && /<link rel="icon"/.test(html);
  check(`${path}: 200, canonical, ${indexable ? 'indexable' : 'noindex'}, description, preview, icon`, ok, `status ${r.status}, canonical ${canonical ?? 'missing'}, noindex ${noindex}`);
}
const nf = await get('tr/yok-boyle-bir-sayfa/');
check('unknown address: 404 page with noindex', nf.status === 404 && /<meta name="robots" content="[^"]*noindex/.test(nf.text), `status ${nf.status}`);

// 3. The notice and the form.
const notice = await get('tr/aydinlatma-metni/');
const name = SITE_CONFIG.controller.name;
check('KVKK notice shows the controller name', name !== TO_FILL && notice.text.includes(name.replace(/ı/g, 'ı')), `controller.name = ${name}`);
const mailLeft = notice.text.includes(TO_FILL);
check('KVKK notice has no "TO FILL" left', !mailLeft, mailLeft ? 'the contact email is still a placeholder (owner choice)' : '');
const contact = await get('tr/iletisim/');
check('contact form has the required consent box and posts only to Web3Forms', /id="c-consent"[^>]*required|required[^>]*id="c-consent"/.test(contact.text) && /api\.web3forms\.com\/submit/.test(contact.text) && !/<form[^>]*action="https?:\/\/(?!api\.web3forms\.com)/.test(contact.text));

// 4. Analytics: the served script is the pinned, reviewed one.
const source = JSON.parse(readFileSync('public/vendor/goatcounter/source.json', 'utf8'));
const gc = await get('vendor/goatcounter/count.js', { binary: true });
check('count.js on the live site is the pinned file', gc.status === 200 && createHash('sha256').update(gc.bytes).digest('hex') === source.sha256, `status ${gc.status}`);
check('pages name only the configured GoatCounter address', (await get('tr/')).text.includes(`data-gc-endpoint="${SITE_CONFIG.goatcounter.endpoint}"`));

// 5. A sample of sitemap addresses answers 200.
const step = Math.max(1, Math.floor(locs.length / sample));
const picked = locs.filter((_, i) => i % step === 0).slice(0, sample);
const bad = [];
for (const url of picked) {
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (r.status !== 200) bad.push(`${r.status} ${url}`);
}
check(`${picked.length} sampled sitemap addresses answer 200`, bad.length === 0 && picked.length > 0, bad.slice(0, 3).join('; '));

for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok || !r.detail ? '' : `  [${r.detail}]`}`);
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\ncheck:live FAILED (${failed.length} of ${results.length})` : `\ncheck:live passed (${results.length} checks against ${site})`);
process.exit(failed.length ? 1 : 0);
