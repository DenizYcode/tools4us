// Controlled vocabularies. One place, shared by the validator, the Excel dropdowns and the migration.
// Adding a value here is a deliberate edit; the build fails on any value that is not listed.

export const VOCAB = {
  family: ['switching', 'wireless', 'routing', 'datacenter'],
  status: ['draft', 'ready'],
  scope: ['in', 'excluded'],
  lifecycle: ['current', 'eos_announced', 'eos'],
  // Where the device is managed. "Unified" on the site is derived: a model with both on_prem and cloud.
  management: ['on_prem', 'cloud', 'cisco_business', 'embedded'],
  accessory_kind: [
    'network_module',
    'line_card',
    'supervisor',
    'fabric_module',
    'antenna',
    'pim',
    'nim',
    'sm',
    'other',
  ],
};

export const VOCAB_NAMES = Object.keys(VOCAB);

export function isInVocab(name, value) {
  const list = VOCAB[name];
  if (!list) throw new Error(`Unknown vocabulary "${name}"`);
  return list.includes(value);
}
