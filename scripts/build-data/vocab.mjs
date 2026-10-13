// Controlled vocabularies. One place, shared by the validator, the Excel dropdowns and the migration.
// Adding a value here is a deliberate edit; the build fails on any value that is not listed.

import featureVocab from './vocab-features.json' with { type: 'json' };

// Feature vocabularies per family are generated from the legacy data by the migration and then
// maintained by hand here: add a value deliberately, never by typing a new spelling in a sheet.
const FEATURES = Object.fromEntries(
  ['switching', 'wireless', 'routing', 'datacenter'].map((f) => [`${f}_feature`, featureVocab[f] ?? []]),
);

export const VOCAB = {
  family: ['switching', 'wireless', 'routing', 'datacenter'],
  status: ['draft', 'ready'],
  scope: ['in', 'excluded'],
  lifecycle: ['current', 'eos_announced', 'eos'],
  // Where the device is managed. "Unified" on the site is derived: a model with both on_prem and cloud.
  management: ['on_prem', 'cloud', 'cisco_business', 'embedded', 'nexus', 'san', 'hyperfabric'],
  accessory_kind: [
    'network_module',
    'line_card',
    'supervisor',
    'fabric_module',
    'antenna',
    'pim',
    'nim',
    'sm',
    'im',
    'other',
  ],
  media: ['copper', 'fiber', 'hybrid'],
  // wireless
  wifi_generation: ['6', '6e', '7'],
  environment: ['indoor', 'outdoor', 'indoor_outdoor'],
  antenna_type: ['internal_omni', 'internal_directional', 'internal', 'external', 'wall_plate', 'internal_optional_kit'],
  poe_standard: ['af', 'at', 'bt'],
  // switching
  switch_form: ['rack', 'desktop', 'rugged', 'chassis'],
  role: ['access', 'distribution', 'core'],
  poe_type: ['poe', 'poe_plus', 'upoe', 'upoe_plus', 'fourpair'],
  poe_coverage: ['all', 'partial', 'line_card'],
  layer3: ['l2', 'basic_l3', 'full_l3', 'unmanaged'],
  // routing
  router_form: ['rack', 'desktop', 'chassis', 'rugged', 'virtual'],
  router_deployment: ['small', 'medium', 'large', 'aggregation', 'dc', 'virtual'],
  cellular: ['none', 'embedded', 'pluggable'],
  // data center
  dc_device_type: ['fixed', 'modular_chassis'],
  dc_role: ['leaf', 'spine', 'super_spine', 'access', 'tor', 'aggregation', 'services', 'multiservice', 'san_fabric', 'san_director', 'san_extension'],
  os_mode: ['nx_os', 'aci', 'mds_nx_os', 'hyperfabric', 'hypershield'],
  ...FEATURES,
};

export const VOCAB_NAMES = Object.keys(VOCAB);

export function isInVocab(name, value) {
  const list = VOCAB[name];
  if (!list) throw new Error(`Unknown vocabulary "${name}"`);
  return list.includes(value);
}
