// Filter groups and filter panels for the three families. A family page renders its panel from PANELS and
// filters with the groups in FILTERS (engine: filter-engine.mjs). Option labels are i18n keys; `term` is a
// glossary key that adds a "?" button beside the option.

import { POE_RANK } from './wireless-model.mjs';

export const MGMT_TEST = {
  on_prem: (c) => c.management.includes('on_prem'),
  cloud: (c) => c.management.includes('cloud'),
  unified: (c) => c.unified,
  cisco_business: (c) => c.management.includes('cisco_business'),
};
const mgmt = { id: 'mgmt', kind: 'multi', test: (c, v) => MGMT_TEST[v]?.(c) ?? false };

// ---- Wireless
export const WIRELESS_FILTERS = [
  mgmt,
  { id: 'gen', kind: 'multi', test: (c, v) => String(c.wifi_generation) === v },
  // An indoor+outdoor model fits both choices.
  { id: 'env', kind: 'multi', test: (c, v) => c.environment === v || c.environment === 'indoor_outdoor' },
  // "My switch gives at most X": the model must reach full function on X or less.
  { id: 'poeMax', kind: 'single', test: (c, v) => POE_RANK[c.poe_full] <= POE_RANK[v] },
  { id: 'sixGhz', kind: 'flag', test: (c) => c.bands_ghz.includes(6) },
  { id: 'mgig', kind: 'flag', test: (c) => c.uplink_max_gbps >= 2.5 },
  { id: 'features', kind: 'all', test: (c, v) => c.features.includes(v) },
];

// ---- Switching
export const SWITCH_FILTERS = [
  mgmt,
  // "At least N ports" (not buckets: the old site lost 28- and 32-port models between buckets).
  { id: 'ports', kind: 'single', test: (c, v) => (c.port_count ?? 0) >= Number(v) },
  // 'any' = a switch that gives PoE at all; a number = at least that many watts in total.
  { id: 'poeMin', kind: 'single', test: (c, v) => (v === 'any' ? c.poe : c.poe && (c.poe_budget_w ?? 0) >= Number(v)) },
  { id: 'uplinkMin', kind: 'single', test: (c, v) => (c.uplink_max_gbps ?? 0) >= Number(v) },
  { id: 'form', kind: 'multi', test: (c, v) => c.switch_form === v },
  { id: 'stacking', kind: 'flag', test: (c) => c.stacking },
  { id: 'mgig', kind: 'flag', test: (c) => c.mgig },
  { id: 'l3', kind: 'flag', test: (c) => c.layer3 === 'basic_l3' || c.layer3 === 'full_l3' },
];

// ---- Routing
export const ROUTER_FILTERS = [
  mgmt,
  { id: 'thrMin', kind: 'single', test: (c, v) => (c.throughput_mbps ?? 0) >= Number(v) },
  { id: 'secMin', kind: 'single', test: (c, v) => (c.security_throughput_mbps ?? 0) >= Number(v) },
  { id: 'wanMin', kind: 'single', test: (c, v) => (c.wan_port_count ?? 0) >= Number(v) },
  // "Large" also matches the aggregation and data-centre classes.
  { id: 'deploy', kind: 'multi', test: (c, v) => (v === 'dc' ? c.deployment === 'dc' || c.deployment === 'aggregation' : c.deployment === v) },
  { id: 'form', kind: 'multi', test: (c, v) => c.form_factor.includes(v) },
  { id: 'sdWan', kind: 'flag', test: (c) => c.sd_wan },
  { id: 'cellular', kind: 'flag', test: (c) => c.cellular !== 'none' },
  { id: 'modules', kind: 'flag', test: (c) => c.modules },
  { id: 'poe', kind: 'flag', test: (c) => c.poe },
];

export const FILTERS = { wireless: WIRELESS_FILTERS, switching: SWITCH_FILTERS, routing: ROUTER_FILTERS };

// ---- Panels. A section is a fieldset: { name?, legend, legendTerm?, hint?, input, options }.
// input 'checkbox' or 'radio'; an option is { value, label, term?, name? } where `name` overrides the section
// name (flags are one checkbox each). `dynamic: 'features'` takes its options from the published data.
const opt = (value, label, term) => ({ value, label, term });
const mgmtSection = (values) => ({
  name: 'mgmt',
  legend: 'filters.mgmt',
  input: 'checkbox',
  options: values.map((v) => opt(v, `val.mgmt.${v}`, v)),
});
const radio = (name, legend, hint, anyLabel, values, labelOf, term) => ({
  name,
  legend,
  legendTerm: term,
  hint,
  input: 'radio',
  options: [opt('', anyLabel), ...values.map((v) => opt(v, labelOf(v)))],
});

export const PANELS = {
  wireless: [
    mgmtSection(['on_prem', 'cloud', 'unified', 'cisco_business']),
    { name: 'gen', legend: 'filters.gen', input: 'checkbox', options: [opt('7', 'val.gen.7', 'wifi_7'), opt('6e', 'val.gen.6e', 'wifi_6e'), opt('6', 'val.gen.6', 'wifi_6')] },
    { name: 'env', legend: 'filters.env', input: 'checkbox', options: [opt('indoor', 'val.env.indoor'), opt('outdoor', 'val.env.outdoor')] },
    {
      name: 'poeMax',
      legend: 'filters.poe',
      legendTerm: 'poe',
      hint: 'filters.poeHint',
      input: 'radio',
      options: [opt('', 'filters.poeAny'), opt('af', 'val.poe.af', 'poe_af'), opt('at', 'val.poe.at', 'poe_at'), opt('bt', 'val.poe.bt', 'poe_bt')],
    },
    {
      legend: 'filters.extras',
      input: 'checkbox',
      options: [{ ...opt('1', 'filters.sixghz', 'six_ghz'), name: 'sixGhz' }, { ...opt('1', 'filters.mgig', 'mgig'), name: 'mgig' }],
    },
    { name: 'features', legend: 'filters.features', hint: 'filters.featuresHint', input: 'checkbox', dynamic: 'features', options: [] },
  ],
  switching: [
    mgmtSection(['on_prem', 'cloud', 'unified', 'cisco_business']),
    radio('ports', 'filters.sw.ports', null, 'filters.sw.portsAny', ['8', '16', '24', '48'], (v) => `filters.sw.ports.${v}`),
    radio('poeMin', 'filters.sw.poe', 'filters.sw.poeHint', 'filters.sw.poeAny', ['any', '120', '370', '740'], (v) => `filters.sw.poe.${v}`, 'poe_budget'),
    radio('uplinkMin', 'filters.sw.uplink', null, 'filters.sw.uplinkAny', ['10', '25', '100'], (v) => `filters.sw.uplink.${v}`, 'uplink'),
    { name: 'form', legend: 'filters.sw.form', input: 'checkbox', options: [opt('rack', 'val.switchform.rack'), opt('desktop', 'val.switchform.desktop'), opt('rugged', 'val.switchform.rugged')] },
    {
      legend: 'filters.extras',
      input: 'checkbox',
      options: [
        { ...opt('1', 'filters.sw.stacking', 'stacking'), name: 'stacking' },
        { ...opt('1', 'filters.sw.mgig', 'mgig'), name: 'mgig' },
        { ...opt('1', 'filters.sw.l3', 'layer3'), name: 'l3' },
      ],
    },
  ],
  routing: [
    mgmtSection(['on_prem', 'cloud', 'unified']),
    radio('thrMin', 'filters.rt.thr', 'filters.rt.thrHint', 'filters.rt.thrAny', ['1000', '5000', '20000', '100000'], (v) => `filters.rt.thr.${v}`, 'throughput'),
    radio('secMin', 'filters.rt.sec', 'filters.rt.secHint', 'filters.rt.secAny', ['500', '1000', '5000'], (v) => `filters.rt.sec.${v}`, 'security_throughput'),
    radio('wanMin', 'filters.rt.wan', null, 'filters.rt.wanAny', ['2', '4', '8'], (v) => `filters.rt.wan.${v}`),
    { name: 'deploy', legend: 'filters.rt.deploy', input: 'checkbox', options: ['small', 'medium', 'large', 'dc', 'virtual'].map((v) => opt(v, `val.deploy.${v}`)) },
    { name: 'form', legend: 'filters.rt.form', input: 'checkbox', options: ['desktop', 'rack'].map((v) => opt(v, `val.form.${v}`)) },
    {
      legend: 'filters.extras',
      input: 'checkbox',
      options: [
        { ...opt('1', 'filters.rt.sdwan', 'sd_wan'), name: 'sdWan' },
        { ...opt('1', 'filters.rt.cellular', 'cellular_backup'), name: 'cellular' },
        { ...opt('1', 'filters.rt.modules', 'module_slots'), name: 'modules' },
        { ...opt('1', 'filters.rt.poe', 'poe'), name: 'poe' },
      ],
    },
  ],
};

// Which single-choice groups show a chip with a sentence ("Anahtar gücü: 802.3at") instead of the bare label.
export const CHIP_KEYS = {
  poeMax: 'filters.poeChip',
  thrMin: 'filters.rt.thrChip',
  secMin: 'filters.rt.secChip',
};

// The card fields each family's filter groups read. A model row carries only these in its data-card attribute,
// so the page script filters with the same tested code (a test checks that nothing else is needed).
export const FILTER_FIELDS = {
  wireless: ['lifecycle', 'management', 'unified', 'wifi_generation', 'environment', 'poe_full', 'bands_ghz', 'uplink_max_gbps', 'features'],
  switching: ['lifecycle', 'management', 'unified', 'port_count', 'poe', 'poe_budget_w', 'uplink_max_gbps', 'switch_form', 'stacking', 'mgig', 'layer3'],
  routing: ['lifecycle', 'management', 'unified', 'throughput_mbps', 'security_throughput_mbps', 'wan_port_count', 'deployment', 'form_factor', 'sd_wan', 'cellular', 'modules', 'poe'],
};
