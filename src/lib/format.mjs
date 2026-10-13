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
    case 'poe':
    case 'stacking':
    case 'mgig':
    case 'sd_wan':
    case 'modules':
      return value ? s['val.yes'] : s['val.no'];
    case 'poe_type':
      return label(s, `val.poetype.${value}`);
    case 'poe_budget_w':
      return fill(s['val.watts'], { n: num(value, lang) });
    case 'downlink_max_gbps':
    case 'wan_port_max_gbps':
      return fill(s['val.gbps'], { n: num(value, lang) });
    case 'uplink_gbps':
      return value.map((n) => fill(s['val.gbps'], { n: num(n, lang) })).join(' / ');
    case 'layer3':
      return label(s, `val.layer3.${value}`);
    case 'switch_form':
      return label(s, `val.switchform.${value}`);
    case 'form_factor':
      return value.map((f) => label(s, `val.form.${f}`)).join(', ');
    case 'deployment':
      return label(s, `val.deploy.${value}`);
    case 'cellular':
      return label(s, `val.cellular.${value}`);
    case 'throughput_mbps':
    case 'security_throughput_mbps':
      return value >= 1000 ? fill(s['val.gbps'], { n: num(value / 1000, lang) }) : fill(s['val.mbps'], { n: num(value, lang) });
    default:
      return String(value);
  }
}
