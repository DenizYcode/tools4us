// Global search over a pre-built index (see search-index.mjs). Pure functions, no DOM: the search page, the hero box
// and the tests all use the same code. Pagefind was tested first and failed the SPEC "Text search" rule (ı and ğ do
// not fold, typos are not tolerated), so this is the SPEC fallback: a normalized index searched in the browser.
//
// Rules: Turkish letters match their plain forms both ways (ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u); case does not matter;
// "C9300-24P", "c9300 24p" and "c930024p" are the same PID; every word of the query must match (AND); a word matches
// exactly, as a prefix, or, for plain words of 4+ letters, with one typo (two from 8 letters). Numbers and PIDs are
// never matched loosely, so a PID that is not published (a draft) can never turn up as a near neighbour.

const FOLD = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ç: 'c', Ç: 'c', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u' };

/** Lowercase, Turkish letters folded, accents stripped, everything that is not a letter or digit becomes one space. */
export function normalize(text) {
  return String(text ?? '')
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (c) => FOLD[c])
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** A PID with every separator removed: "C9300-24P" -> "c930024p". */
export const compact = (text) => normalize(text).replace(/ /g, '');

export const words = (text) => {
  const n = normalize(text);
  return n ? [...new Set(n.split(' '))] : [];
};

/** Optimal string alignment distance (insert, delete, replace, swap of neighbours), giving up above `max`. */
export function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      row.push(d);
      if (d < best) best = d;
    }
    if (best > max) return max + 1;
    prev2.length = 0;
    prev2.push(...prev);
    prev = row;
  }
  return prev[b.length];
}

const allowedTypos = (token) => (/\d/.test(token) ? 0 : token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0);

/** How well one query word matches a list of words: 3 exact, 2 prefix, 1 with a typo, 0 not at all. */
function wordMatch(token, list) {
  let best = 0;
  const typos = allowedTypos(token);
  for (const w of list) {
    if (w === token) return 3;
    if (best < 2 && w.length > token.length && w.startsWith(token)) best = 2;
    else if (best < 1 && typos && distance(token, w, typos) <= typos) best = 1;
  }
  return best;
}

// What a match in each field is worth. A name or PID beats a series, which beats running text.
const FIELD_WEIGHT = { name: 30, series: 18, text: 6 };
const MATCH_FACTOR = { 3: 1, 2: 0.8, 1: 0.4 };

/** Score of one entry for the query tokens, or 0 when any token finds nothing. */
function scoreEntry(entry, tokens) {
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [field, weight] of Object.entries(FIELD_WEIGHT)) {
      const m = wordMatch(token, entry.w[field] ?? []);
      if (m) best = Math.max(best, weight * MATCH_FACTOR[m]);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

/** PID score: whole PID 1000, PID starts with the query 800, PID contains the query 500. 0 when the query is too short. */
function pidScore(entry, q) {
  if (q.length < 3 || !entry.pids?.length) return 0;
  let best = 0;
  for (const pid of entry.pids) {
    const c = compact(pid);
    if (c === q) best = Math.max(best, 1000);
    else if (c.startsWith(q)) best = Math.max(best, 800 - Math.min(c.length - q.length, 50));
    else if (q.length >= 4 && c.includes(q)) best = Math.max(best, 500);
  }
  return best;
}

/** Index entries travel as JSON with their word lists as plain strings; this turns them back into arrays. */
export const prepareIndex = (raw) => raw.map((e) => ({ ...e, w: Object.fromEntries(Object.entries(e.w).map(([k, v]) => [k, typeof v === 'string' ? (v ? v.split(' ') : []) : v])) }));

const KIND_RANK = { page: 0, model: 1, term: 2, story: 3 };

/**
 * Search the index. Returns [{ entry, score }] best first. An entry is `{ id, kind, title, w: { name, series, text },
 * pids?, ... }` as built by search-index.mjs.
 */
export function search(index, query, { limit = 40 } = {}) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const q = tokens.join('');
  const hits = [];
  for (const entry of index) {
    const score = Math.max(pidScore(entry, q), scoreEntry(entry, tokens));
    if (score > 0) hits.push({ entry, score });
  }
  hits.sort((a, b) => b.score - a.score || KIND_RANK[a.entry.kind] - KIND_RANK[b.entry.kind] || a.entry.title.localeCompare(b.entry.title));
  return hits.slice(0, limit);
}
