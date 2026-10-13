// What each family's pages show: the spec rows of the detail page (key, in order) and the glossary term
// beside a spec. Values are formatted by format.mjs; labels are the spec.* i18n keys.

export const DETAIL_SPECS = {
  wireless: ['wifi_generation', 'environment', 'management', 'bands_ghz', 'spatial_streams', 'radio_config', 'antenna_type', 'uplink_max_gbps', 'port_count', 'features', 'rugged'],
  switching: ['management', 'switch_form', 'port_count', 'downlink_max_gbps', 'mgig', 'uplink_gbps', 'stacking', 'layer3'],
  routing: ['management', 'deployment', 'form_factor', 'wan_port_count', 'wan_port_max_gbps', 'lan_port_count', 'sd_wan', 'cellular', 'modules', 'poe', 'max_vpn_tunnels'],
};

// Glossary term shown beside a spec value (a "?" button), by spec key: a function of the card.
export const SPEC_TERMS = {
  wireless: { wifi_generation: (c) => (c.wifi_generation === '7' ? 'wifi_7' : c.wifi_generation === '6e' ? 'wifi_6e' : 'wifi_6') },
  switching: { mgig: () => 'mgig', stacking: () => 'stacking', layer3: () => 'layer3', uplink_gbps: () => 'uplink' },
  routing: { sd_wan: () => 'sd_wan', cellular: () => 'cellular_backup', modules: () => 'module_slots' },
};
