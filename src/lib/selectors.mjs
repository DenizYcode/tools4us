// The guided selector of each family: the questions (name, options, default answer), the i18n prefix of its
// texts, and the recommend function. The selector page renders and runs whichever family it is given.

import { ANSWER_OPTIONS, recommend } from './selector.mjs';
import { SWITCH_OPTIONS, SWITCH_DEFAULTS, recommendSwitch } from './selector-switching.mjs';
import { ROUTER_OPTIONS, ROUTER_DEFAULTS, recommendRouter } from './selector-routing.mjs';

// The card fields each family's recommend function reads. The selector page sends only these (plus name, slug,
// summary, recommended) for current models, so End-of-Sale models never reach the page.
export const SELECTOR_FIELDS = {
  wireless: ['environment', 'management', 'unified', 'wifi_generation', 'bands_ghz', 'spatial_streams', 'poe_full'],
  switching: ['management', 'unified', 'port_count', 'poe', 'poe_type', 'poe_budget_w', 'uplink_max_gbps', 'stacking', 'layer3'],
  routing: ['management', 'unified', 'form_factor', 'wan_port_count', 'throughput_mbps', 'security_throughput_mbps', 'sd_wan', 'cellular', 'licence_required'],
};

export const SELECTORS = {
  wireless: {
    prefix: 'selector',
    questions: [
      ['env', ANSWER_OPTIONS.env, 'indoor'],
      ['mgmt', ANSWER_OPTIONS.mgmt, 'any'],
      ['poe', ANSWER_OPTIONS.poe, 'unknown'],
      ['density', ANSWER_OPTIONS.density, 'low'],
      ['future', ANSWER_OPTIONS.future, 'any'],
    ],
    // Glossary term beside a question.
    terms: { poe: 'poe' },
    assumptions: 4,
    recommend,
  },
  switching: {
    prefix: 'selector.sw',
    questions: Object.keys(SWITCH_OPTIONS).map((q) => [q, SWITCH_OPTIONS[q], SWITCH_DEFAULTS[q]]),
    terms: { poeCount: 'poe', poeWatts: 'poe', uplink: 'uplink', extra: 'stacking' },
    assumptions: 4,
    recommend: recommendSwitch,
  },
  routing: {
    prefix: 'selector.rt',
    questions: Object.keys(ROUTER_OPTIONS).map((q) => [q, ROUTER_OPTIONS[q], ROUTER_DEFAULTS[q]]),
    terms: { size: 'throughput', sdwan: 'sd_wan', cellular: 'cellular_backup' },
    assumptions: 4,
    recommend: recommendRouter,
  },
};
