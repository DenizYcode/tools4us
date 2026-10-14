// WCAG 2.1 contrast check for the design tokens. Reads src/styles/tokens.css, so the colours are
// defined once. Exits 1 when a pair is below its minimum (4.5:1 text, 3:1 for large text and UI edges).
//   node scripts/check-contrast.mjs

import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
const colour = {};
for (const [, name, hex] of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) colour[name] = hex;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum, where it is used]
const PAIRS = [
  ['ink', 'bg', 4.5, 'body text'],
  ['ink', 'bg-soft', 4.5, 'body text on soft panels'],
  ['ink', 'bg-tint', 4.5, 'body text on tinted panels'],
  ['navy-900', 'bg', 4.5, 'headings'],
  ['navy-900', 'bg-soft', 4.5, 'headings on soft panels'],
  ['muted', 'bg', 4.5, 'secondary text'],
  ['muted', 'bg-soft', 4.5, 'secondary text on soft panels'],
  ['accent', 'bg', 4.5, 'links and accent text'],
  ['accent', 'bg-soft', 4.5, 'links on soft panels'],
  ['accent-strong', 'bg-tint', 4.5, 'accent text on tinted panels'],
  ['white', 'accent', 4.5, 'button text'],
  ['white', 'accent-strong', 4.5, 'button text, hover'],
  ['on-navy', 'navy-900', 4.5, 'header and hero text'],
  ['on-navy-muted', 'navy-900', 4.5, 'secondary text on navy'],
  ['on-navy', 'navy-700', 4.5, 'text on mid navy'],
  ['border-strong', 'bg', 3, 'edges of controls and tiles'],
  ['border-strong', 'bg-soft', 3, 'edges of controls on soft panels'],
  ['focus', 'bg', 3, 'focus ring on white'],
  ['focus', 'bg-soft', 3, 'focus ring on soft panels'],
  ['focus-on-navy', 'navy-900', 3, 'focus ring on navy'],
  ['warn-ink', 'warn-bg', 4.5, 'caution note text'],
  ['warn-edge', 'bg', 3, 'caution note edge'],
  ['eos-ink', 'eos-bg', 4.5, 'End-of-Sale badge and banner text'],
  ['eos-edge', 'bg', 3, 'End-of-Sale banner edge'],
  ['ink', 'warn-bg', 4.5, 'body text inside a caution note'],
  ['ink', 'eos-bg', 4.5, 'body text inside an End-of-Sale banner'],
  ['accent', 'eos-bg', 4.5, 'links inside an End-of-Sale banner'],
  ['accent', 'warn-bg', 4.5, 'links inside a caution note'],
  ['accent-bright', 'navy-900', 4.5, 'accent text and graphics on navy'],
  ['accent-bright', 'navy-700', 4.5, 'accent text and graphics on mid navy'],
];

export function checkContrast() {
  const rows = PAIRS.map(([fg, bg, min, use]) => {
    if (!colour[fg] || !colour[bg]) throw new Error(`Token missing: ${fg} or ${bg}`);
    const r = ratio(colour[fg], colour[bg]);
    return { fg, bg, min, use, ratio: r, ok: r >= min };
  });
  return rows;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = checkContrast();
  console.log('Contrast (WCAG 2.1 AA): foreground on background');
  for (const r of rows) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.ratio.toFixed(2).padStart(5)}:1 (min ${r.min})  ${r.fg} on ${r.bg}  ${r.use}`);
  const bad = rows.filter((r) => !r.ok);
  console.log(bad.length ? `\ncheck:design FAILED: ${bad.length} pair(s) below the minimum` : `\ncheck:design passed (${rows.length} pairs)`);
  process.exit(bad.length ? 1 : 0);
}
