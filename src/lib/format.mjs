// Formats raw card values for display, in one place, for the detail page (server) and the compare table
// (browser). `s` is the dictionary of val.* strings for the reader's language.

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** 2.5 -> "2,5" in Turkish, "2.5" in English. */
export function num(n, lang) {
  return String(n).replace('.', lang === 'tr' ? ',' : '.');
}

const label = (s, key) => {
  const text = s[key];
  if (text === undefined) throw new Error(`Missing label ${key}`);
  return text;
};

export function formatValue(key, value, s, lang) {
  const dash = s['val.none'] ?? '–';
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return dash;
  switch (key) {
    case 'lifecycle':
      return label(s, `val.life.${value}`);
    case 'wifi_generation':
      return label(s, `val.gen.${value}`);
    case 'environment':
      return label(s, `val.env.${value}`);
    case 'management':
      return value.map((m) => label(s, `val.mgmt.${m}`)).join(', ');
    case 'bands_ghz':
      return `${value.map((b) => num(b, lang)).join(' / ')} GHz`;
    case 'antenna_type':
      return label(s, `val.antenna.${value}`);
    case 'uplink_max_gbps':
      return fill(s['val.gbps'], { n: num(value, lang) });
    case 'poe_full':
      return label(s, `val.poe.${value}`);
    case 'poe_supported':
      return value.map((p) => label(s, `val.poe.${p}`)).join(', ');
    case 'features':
      return value.map((f) => label(s, `val.feature.${f}`)).join(', ');
    case 'replaced_by':
      return value.join(', ');
    case 'rugged':
      return value ? s['val.yes'] : s['val.no'];
    default:
      return String(value);
  }
}
