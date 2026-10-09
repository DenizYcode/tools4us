// Shared helpers for the legacy -> catalog migration. Everything here is mechanical conversion of
// what the legacy cell already says; anything ambiguous returns null and is reported, never guessed.

export const blank = (v) => v === undefined || v === null || String(v).trim() === '';
export const clean = (v) => (blank(v) ? null : String(v).replace(/\s+/g, ' ').trim());

export function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function yesNo(v) {
  if (blank(v)) return null;
  const t = String(v).trim().toLowerCase();
  if (t === 'yes') return true;
  if (t === 'no') return false;
  return null;
}

export function toInt(v) {
  if (blank(v)) return null;
  const t = String(v).trim();
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

const UNIT = { m: 0.001, mbps: 0.001, g: 1, gbps: 1 };

// "1G", "10Gbps", "100M", "25G, 100G", "100G / 400G", "1/10/25G", "8/16/32/64G FC".
// Returns sorted unique numbers in Gbps. Text such as "Modular" returns [].
export function parseGbpsList(text) {
  if (blank(text)) return [];
  const out = new Set();
  const re = /((?:\d+(?:\.\d+)?\s*\/\s*)*\d+(?:\.\d+)?)\s*(Gbps|Mbps|G|M)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const unit = UNIT[m[2].toLowerCase()];
    for (const n of m[1].split('/')) out.add(Number((Number(n.trim()) * unit).toFixed(4)));
  }
  return [...out].sort((a, b) => a - b);
}

// "450 Mbps" -> 450, "5.6 Gbps" -> 5600, "2.4 Tbps" -> 2400000, "Up to 115.2 Tbps" -> 115200000.
// Ranges and anything else return null.
export function toMbps(text) {
  if (blank(text)) return null;
  const m = String(text).match(/^(?:up to\s+|~\s*)?(\d+(?:\.\d+)?)\s*(Mbps|Gbps|Tbps)\b/i);
  if (!m) return null;
  const factor = { mbps: 1, gbps: 1000, tbps: 1_000_000 }[m[2].toLowerCase()];
  return Number((Number(m[1]) * factor).toFixed(3));
}

// Cisco documentation links in the legacy data sometimes lack https:// or are wrapped in brackets.
export function fixUrl(text) {
  if (blank(text)) return { url: null };
  let t = String(text).trim().replace(/^\(+|\)+$/g, '');
  if (/^https:\/\//i.test(t)) return { url: t };
  if (/^http:\/\//i.test(t)) return { url: t.replace(/^http:/i, 'https:') };
  if (/^(www\.)?(cisco|documentation\.meraki)\.com\//i.test(t) || /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(t)) return { url: `https://${t}` };
  return { url: null, bad: text };
}

// Feature tokens: split a free-text list, drop negative qualifiers, and slug the rest.
export function featureTokens(text) {
  if (blank(text)) return [];
  const out = [];
  for (const raw of String(text).split(/[,;]/)) {
    let t = raw.trim();
    if (!t) continue;
    t = t.replace(/\((no [^)]*)\)/gi, '').trim(); // "IVR (no VXLAN/EVPN)" -> "IVR"
    out.push(t);
  }
  return out;
}

export function sortedUnique(list) {
  return [...new Set(list)];
}
