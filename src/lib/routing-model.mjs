// Routing model cards (Catalyst routers, ISR, Meraki MX, vMX and Z-Series): the shared card builder plus the
// router-specific fields and ordering. Routing rows are one PID per model.
//
// throughput_mbps is the forwarding throughput (Meraki: stateful firewall); security_throughput_mbps is the
// IPsec throughput (Meraki: next-generation firewall). The second one depends on a licence, and the licence
// note says which.

import { buildCards, seriesBands } from './cards.mjs';

const SAME = ['series', 'lifecycle', 'last_order'];

export function groupRouterCards(models) {
  return buildCards(models, {
    same: SAME,
    extract: (first) => {
      // End-of-Sale rows keep a legacy forwarding number that was not re-verified (docs/Phase4_Routing_Verification.md):
      // a row is verified when it is current or carries a verified security throughput. Unverified numbers are not shown.
      const perfVerified = first.lifecycle === 'current' || (first.security_throughput_mbps ?? null) !== null;
      return {
        perf_verified: perfVerified,
        form_factor: first.form_factor ?? [],
        deployment: first.deployment ?? null,
        sd_wan: first.sd_wan === true,
        wan_port_count: first.wan_port_count ?? null,
        wan_port_max_gbps: first.wan_port_max_gbps ?? null,
        lan_port_count: first.lan_port_count ?? null,
        cellular: first.cellular ?? 'none',
        throughput_mbps: perfVerified ? first.throughput_mbps ?? null : null,
        security_throughput_mbps: first.security_throughput_mbps ?? null,
        max_vpn_tunnels: first.max_vpn_tunnels ?? null,
        poe: first.poe === true,
        // Any module slot: a NIM, SM or pluggable cellular (PIM) slot.
        modules: (first.nim_slots ?? 0) + (first.sm_slots ?? 0) + (first.pim_slots ?? 0) > 0,
      };
    },
  });
}

export const ROUTER_SERIES_ORDER = [
  'C8100-G2', 'C8200-G2', 'C8300-G2', 'C8400-G2', 'C8500-G2', 'C8600-G2',
  'ISR1000',
  'MX67', 'MX68', 'MX75', 'MX85', 'MX95', 'MX105', 'MX250', 'MX450', 'vMX', 'Z-Series',
  'C8200', 'C8300', 'C8500L', 'C8500', 'C900', 'MX84',
];

export function bySeries(cards, seriesRows) {
  return seriesBands(cards, seriesRows, {
    order: ROUTER_SERIES_ORDER,
    cardOrder: (a, b) => (a.throughput_mbps ?? 0) - (b.throughput_mbps ?? 0) || a.name.localeCompare(b.name),
  });
}
