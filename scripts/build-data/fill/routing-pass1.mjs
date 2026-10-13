// Phase 4 data pass for routing.xlsx: the core SMB set (Catalyst 8000 gen 1 and G2, ISR 1000 and 900,
// Meraki MX, vMX and Z-Series), verified against Cisco and Meraki datasheets and End-of-Sale bulletins on
// 2026-10-13. The evidence is in docs/Phase4_Routing_Verification.md. Turkish and English text is generated
// from the verified specs with fixed templates plus one hand-written explainer per series; it needs native
// review. Nothing is invented: where a source was silent the field stays empty and the row stays draft
// (see NOT_READY).
//
// Performance numbers: throughput_mbps is the forwarding (or, for MX, stateful firewall) throughput and
// security_throughput_mbps is the IPsec (or, for MX, next-generation firewall) throughput. Rows that are
// End-of-Sale keep their legacy throughput_mbps (not re-verified) and have no security throughput.
//
// Run once: node scripts/build-data/fill/routing-pass1.mjs   (idempotent: it sets the same values again)

import { readWorkbook, writeWorkbook } from '../xlsx-io.mjs';
import { workbookPath } from '../catalog.mjs';

const VERIFIED = '2026-10-13';
const ADDED = '2026-10-13';

const CISCO = 'https://www.cisco.com/c/en/us/products/collateral';
const MX = 'https://documentation.meraki.com/SASE_and_SD-WAN/MX/Product_Information/Overviews_and_Datasheets';
const DS = {
  c8100: 'https://www.cisco.com/site/us/en/products/collateral/networking/sdwan-routers/8000-secure-routers/8100-series-secure-routers-ds.html',
  c8200: 'https://www.cisco.com/site/us/en/products/collateral/networking/sdwan-routers/8000-secure-routers/8200-series-secure-routers-ds.html',
  c8300: 'https://www.cisco.com/site/us/en/products/collateral/networking/sdwan-routers/8000-secure-routers/8300-series-secure-routers-ds.html',
  c8400: 'https://www.cisco.com/site/us/en/products/collateral/networking/sdwan-routers/8000-secure-routers/8400-series-secure-routers-ds.html',
  c8500: 'https://www.cisco.com/site/us/en/products/collateral/networking/sdwan-routers/8000-secure-routers/8500-series-secure-routers-ds.html',
  c8600: 'https://www.cisco.com/site/us/en/products/collateral/networking/sdwan-routers/8000-secure-routers/8600-series-secure-routers-ds.html',
  isr1000: `${CISCO}/routers/1000-series-integrated-services-routers-isr/datasheet-c78-739512.html`,
  mx67: `${MX}/MX67_and_MX68_Datasheet`,
  mx75: `${MX}/MX75_Datasheet`,
  mx85: `${MX}/MX85_Datasheet`,
  mx95: `${MX}/MX95%2F%2F105_Datasheet`,
  mx250: `${MX}/MX250_Datasheet`,
  mx450: `${MX}/MX450_Datasheet`,
  vmx: 'https://documentation.meraki.com/SASE_and_SD-WAN/MX/Install_and_Get_Started/Installation_Guides/vMX_Comparison_Datasheet',
};

// End-of-Sale bulletins. `repl` maps a PID to the PIDs the bulletin names that exist as ready, current models;
// `note` carries what the bulletin names that is not a published model.
const BUL = {
  isr1100: { url: `${CISCO}/routers/1000-series-integrated-services-routers-isr/isr1100-isr1100x-series-routers-eol.html`, announced: '2025-07-28', last_order: '2026-07-28', ldos: '2031-07-31' },
  isr1101: { url: `${CISCO}/routers/1000-series-integrated-services-routers-isr/select-isr-1101-1109-series-routers-eol.html`, announced: '2025-07-28', last_order: '2026-07-28', ldos: '2031-07-31' },
  isr1111: { url: `${CISCO}/routers/1000-series-integrated-services-routers-isr/isr-1111-series-ethernet-routers-eol.html`, announced: '2025-07-28', last_order: '2026-07-28', ldos: '2031-07-31' },
  isr1112: { url: `${CISCO}/routers/1000-series-integrated-services-routers-isr/c1112-1113-1116-1117-1131-1161-series-isr-eol.html`, announced: '2026-07-29', last_order: '2027-01-31', ldos: '2032-01-31' },
  isr900: { url: `${CISCO}/routers/900-series-integrated-services-routers-isr/isr-900-series-routers-licenses-accessories-eol.html`, announced: '2025-07-28', last_order: '2026-07-28', ldos: '2031-07-31' },
  c8200: { url: `${CISCO}/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8300-2n2s-4t2x-6t-1n-4t-c8200l-eol.html`, announced: '2026-07-27', last_order: '2027-07-31', ldos: '2032-07-31' },
  c8300: { url: `${CISCO}/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8500l-8s4x-4t2x-c8300-1n1s-6t-eol.html`, announced: '2026-07-27', last_order: '2027-01-31', ldos: '2032-01-31' },
  c8500: { url: `${CISCO}/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8500-12x-c8500-12x4qc-eol.html`, announced: '2026-07-29', last_order: '2027-01-31', ldos: '2032-01-31' },
  c8500x: { url: `${CISCO}/networking/sdwan-routers/catalyst-8000-edge-platforms/catalyst-c8500-20x6c-eol.html`, announced: '2026-07-27', last_order: '2027-07-31', ldos: '2032-07-31' },
  mx67c: { url: `${CISCO}/security/meraki-cloud-managed-security-appliances/mx67c-mx68cw-eol.pdf`, announced: '2026-08-27', last_order: '2026-11-27', ldos: '2031-11-30' },
  mx84: { url: 'https://documentation.meraki.com/@api/deki/files/15599/MX84_EOS_Notice.pdf?revision=1', announced: '2021-08-10', last_order: '2021-10-31', ldos: '2026-10-31' },
  z3: { url: 'https://documentation.meraki.com/@api/deki/files/24994/Z3-HW_EOS_Notice_(1).pdf?revision=1', announced: '2024-03-04', last_order: '2024-09-04', ldos: '2029-09-04' },
  z3c: { url: 'https://documentation.meraki.com/@api/deki/files/24993/Z3C-HW-NA.pdf?revision=1', announced: '2024-03-04', last_order: '2024-09-04', ldos: '2029-09-04' },
};

const EOS = {
  // Catalyst 8000 gen 1
  'C8200-1N-4T': ['c8200', { repl: ['C8235-E-G2'] }], 'C8200L-1N-4T': ['c8200', { repl: ['C8231-E-G2'] }],
  'C8300-2N2S-4T2X': ['c8200', { none: true }], 'C8300-2N2S-6T': ['c8200', { none: true }],
  'C8300-1N1S-4T2X': ['c8300', { repl: ['C8375-E-G2'] }], 'C8300-1N1S-6T': ['c8300', { repl: ['C8375-E-G2'] }],
  'C8500L-8S4X': ['c8300', { repl: ['C8475-G2'] }],
  'C8500-12X': ['c8500', { repl: ['C8550-G2'] }], 'C8500-12X4QC': ['c8500', { repl: ['C8570-G2'] }],
  'C8500-20X6C': ['c8500x', { repl: ['C8650-G2'] }],
  // ISR 1100 and ISR1100X
  'ISR1100-4G': ['isr1100', { repl: ['C1121X-8P'] }], 'ISR1100-4GLTEGB': ['isr1100', { repl: ['C1121X-8PLTEP'] }],
  'ISR1100X-4G': ['isr1100', { repl: ['C1121X-8P'] }],
  'ISR1100-6G': ['isr1100', { note: ['Cisco\'nun önerdiği yedek: C8200-1N-4T (o da satıştan kalkıyor; yerine C8235-E-G2).', 'The replacement Cisco names: C8200-1N-4T (itself end of sale; replaced by C8235-E-G2).'] }],
  'ISR1100X-6G': ['isr1100', { note: ['Cisco\'nun önerdiği yedek: C8200-1N-4T (o da satıştan kalkıyor; yerine C8235-E-G2).', 'The replacement Cisco names: C8200-1N-4T (itself end of sale; replaced by C8235-E-G2).'] }],
  // ISR 1101 / 1109
  'C1101-4P': ['isr1101', { repl: ['C1121-4P'] }], 'C1101-4PLTEP': ['isr1101', { repl: ['C1121-4PLTEP'] }],
  'C1109-2PLTEGB': ['isr1101', { repl: ['C1121-4PLTEP'] }],
  // ISR 1111
  'C1111-4P': ['isr1111', { repl: ['C1121-4P'] }], 'C1111-4P-DNA': ['isr1111', { repl: ['C1121X-8P'] }],
  'C1111-8P': ['isr1111', { repl: ['C1121-8P'] }], 'C1111-8P-DNA': ['isr1111', { repl: ['C1121X-8P'] }],
  'C1111X-8P': ['isr1111', { repl: ['C1121X-8P'] }],
  // ISR 1112 / 1113 / 1116 / 1117 / 1161
  'C1112-8P': ['isr1112', { none: true }], 'C1113-8P': ['isr1112', { none: true }], 'C1113-8PM': ['isr1112', { none: true }],
  'C1116-4P': ['isr1112', { repl: ['C1126-8PLTEP'] }], 'C1117-4P': ['isr1112', { repl: ['C1127-8PLTEP'] }],
  'C1117-4PM': ['isr1112', { repl: ['C1127-8PMLTEP'] }],
  'C1161-8P': ['isr1112', { none: true }], 'C1161X-8P': ['isr1112', { none: true }],
  'C1161-8PLTEP': ['isr1112', { none: true }], 'C1161X-8PLTEP': ['isr1112', { none: true }],
  // ISR 900
  'C921-4P': ['isr900', { repl: ['C1121-4P'] }], 'C921-4PLTEGB': ['isr900', { repl: ['C1121-4PLTEP'] }],
  'C926-4P': ['isr900', { repl: ['C1126-8PLTEP'], note: ['Bülten C1116-4P\'yi de öneriyor (o da satıştan kalkıyor).', 'The bulletin also names C1116-4P (itself end of sale).'] }],
  'C927-4P': ['isr900', { repl: ['C1127-8PLTEP'], note: ['Bülten C1117-4P\'yi de öneriyor (o da satıştan kalkıyor).', 'The bulletin also names C1117-4P (itself end of sale).'] }],
  'C927-4PM': ['isr900', { repl: ['C1127-8PLTEP'], note: ['Bülten C1117-4PM\'yi de öneriyor (o da satıştan kalkıyor).', 'The bulletin also names C1117-4PM (itself end of sale).'] }],
  'C927-4PLTEGB': ['isr900', { repl: ['C1127-8PLTEP'] }], 'C931-4P': ['isr900', { repl: ['C1121-4P'] }],
  // Meraki
  MX67C: ['mx67c', { note: ['Cisco\'nun önerdiği yedek: Meraki yönetimli Catalyst 8111 G2 yönlendirici (henüz kataloğa eklenmedi).', 'The replacement Cisco names: the Meraki-managed Catalyst 8111 G2 router (not in the catalogue yet).'] }],
  MX68CW: ['mx67c', { note: ['Cisco\'nun önerdiği yedek: Meraki yönetimli Catalyst 8121 G2 yönlendirici (henüz kataloğa eklenmedi).', 'The replacement Cisco names: the Meraki-managed Catalyst 8121 G2 router (not in the catalogue yet).'] }],
  MX84: ['mx84', { repl: ['MX85'] }],
  Z3: ['z3', { note: ['Yedek olarak yeni nesil Z-Series geçidi öneriliyor (henüz kataloğa eklenmedi).', 'A new-generation Z-Series gateway is the suggested replacement (not in the catalogue yet).'] }],
  Z3C: ['z3c', { repl: ['Z4C'], note: ['Z3C-HW-WW için son sipariş 11 Şubat 2024\'tü.', 'The last order for Z3C-HW-WW was 11 February 2024.'] }],
};

// Rows that stay draft, with the reason (copied into needs_data and docs/Phase4_Routing_Needs.md).
const NOT_READY = {
  'C1131-8P': 'The End-of-Sale bulletin for the C1131 series (EOL15945) lists only the Wi-Fi variants (C1131-8PW..), not this PID, so its lifecycle cannot be confirmed.',
  'C1131X-8P': 'The End-of-Sale bulletin for the C1131 series (EOL15945) lists only the Wi-Fi variants (C1131X-8PW..), not this PID, so its lifecycle cannot be confirmed.',
  'C8000V': 'Software router: throughput depends on the instance size ("Compute Bound"); needs a decision on how to show it.',
  'C8111-G2-MX': 'The Meraki datasheet for the -MX Catalyst 8000 models could not be read (the specs are an embedded image).',
  'C8121-G2-MX': 'The Meraki datasheet for the -MX Catalyst 8000 models could not be read (the specs are an embedded image).',
  'C8121-CW-G2-MX': 'The Meraki datasheet for the -MX Catalyst 8000 models could not be read (the specs are an embedded image).',
  'C8355-G2-MX': 'The Meraki datasheet for the -MX Catalyst 8000 models could not be read (the specs are an embedded image).',
  'C8455-G2-MX': 'The Meraki datasheet for the -MX Catalyst 8000 models could not be read (the specs are an embedded image).',
  Z4: 'The Z4 datasheet page could not be read (the specs are not in the page text); Z4C was read and Z4 is not assumed to match it.',
};

// ---- Performance (Mbps): [forwarding, IPsec]. Cisco datasheets, 512-byte packets, "up to".
const PERF = {
  'C8130-G2': [1900, 1500], 'C8130-VAI-G2': [1900, 1500], 'C8130-VAP-G2': [1900, 1500], 'C8130H-G2': [1900, 1500], 'C8131-G2': [1900, 1500],
  'C8140-G2': [5600, 1500], 'C8151-G2': [5600, 1500], 'C8151-CVAI-G2': [5600, 1500], 'C8151-CVAP-G2': [5600, 1500], 'C8151H-C-G2': [5600, 1500],
  'C8161-G2': [5600, 1500],
  'C8211-G2': [5600, 3000], 'C8221-G2': [19000, 5000], 'C8221L-G2': [19000, 5000], 'C8225-G2': [19000, 5000], 'C8231-G2': [19000, 5000],
  'C8231-E-G2': [19000, 5000], 'C8235-G2': [19000, 5000], 'C8235-E-G2': [19000, 5000],
  'C8355-G2': [38000, 20000], 'C8375-E-G2': [38000, 20000], 'C8455-G2': [67000, 31000], 'C8475-G2': [91000, 45000],
  'C8550-G2': [115000, 48000], 'C8570-G2': [190000, 63000], 'C8650-G2': [540000, 225000],
  // ISR 1000: autonomous mode, 512-byte packets
  'C1121-4P': [1600, 500], 'C1121-4PLTEP': [1600, 500], 'C1121-8P': [1600, 600], 'C1121-8PLTEP': [1600, 600], 'C1121X-8P': [1600, 600],
  'C1121X-8PLTEP': [1600, 600], 'C1126-8PLTEP': [1600, 600], 'C1126X-8PLTEP': [1600, 600], 'C1127-8PLTEP': [1600, 600],
  'C1127X-8PLTEP': [1600, 600], 'C1127-8PMLTEP': [1600, 600], 'C1127X-8PMLTEP': [1600, 600], 'C1109-4PLTE2P': [1300, 400],
  // Meraki MX: [stateful firewall, next-generation firewall (detection)]
  MX67: [700, 400], MX67W: [700, 400], MX67C: [700, 400], MX68: [700, 400], MX68W: [700, 400], MX68CW: [700, 400],
  MX75: [1000, 1000], MX85: [1000, 1000], MX95: [3000, 2000], MX105: [5000, 2500], MX250: [7500, 3000], MX450: [10000, 7000],
  'vMX-S': [250, 200], 'vMX-M': [500, 400], 'vMX-L': [1000, 1000], Z4C: [500, 300],
};

// ---- Per-PID spec corrections (each one is reported in the console and the verification doc)
const PATCH = {
  // The datasheet lists SD-WAN support (from IOS XE 26.2.1) for the whole 8100 G2 family
  'C8130-G2': { sd_wan: true }, 'C8130-VAI-G2': { sd_wan: true }, 'C8130-VAP-G2': { sd_wan: true }, 'C8130H-G2': { sd_wan: true }, 'C8140-G2': { sd_wan: true },
  // 8200 G2: WAN ports counted from the datasheet (SFP+ or 10G, plus the 1G/2.5G WAN ports)
  'C8211-G2': { wan_port_count: 2, wan_port_max_gbps: 1 }, 'C8221-G2': { wan_port_count: 4, wan_port_max_gbps: 10 },
  'C8221L-G2': { wan_port_count: 4, wan_port_max_gbps: 10 }, 'C8225-G2': { wan_port_count: 4, wan_port_max_gbps: 10 },
  'C8231-G2': { wan_port_count: 4, wan_port_max_gbps: 10 }, 'C8231-E-G2': { wan_port_count: 4, wan_port_max_gbps: 10 },
  'C8235-G2': { wan_port_count: 4, wan_port_max_gbps: 10 }, 'C8235-E-G2': { wan_port_count: 4, wan_port_max_gbps: 10 },
  // 8300 G2 slots and WAN ports from the datasheet
  'C8355-G2': { nim_slots: 0, sm_slots: 0, pim_slots: 1 },
  'C8375-E-G2': { wan_port_count: 6, wan_port_max_gbps: 10, nim_slots: 1, sm_slots: 1, pim_slots: 1, cellular: 'pluggable' },
  // ISR 1000: dual GE WAN on the C1121, pluggable cellular on every "PLTE" PID
  'C1121-4P': { wan_port_count: 2 }, 'C1121-4PLTEP': { wan_port_count: 2, cellular: 'pluggable' }, 'C1121-8P': { wan_port_count: 2 },
  'C1121-8PLTEP': { wan_port_count: 2, cellular: 'pluggable' }, 'C1121X-8P': { wan_port_count: 2 },
  'C1121X-8PLTEP': { wan_port_count: 2, cellular: 'pluggable' }, 'C1126-8PLTEP': { cellular: 'pluggable' },
  'C1126X-8PLTEP': { cellular: 'pluggable' }, 'C1127-8PLTEP': { cellular: 'pluggable' }, 'C1127X-8PLTEP': { cellular: 'pluggable' },
  'C1127-8PMLTEP': { cellular: 'pluggable' }, 'C1127X-8PMLTEP': { cellular: 'pluggable' }, 'C1109-4PLTE2P': { cellular: 'pluggable' },
  'C1101-4PLTEP': { cellular: 'pluggable' }, 'C1109-2PLTEGB': { cellular: 'pluggable' },
  'C1161-8PLTEP': { cellular: 'pluggable' }, 'C1161X-8PLTEP': { cellular: 'pluggable' },
  // The C8130 DSL models have a DSL WAN port, not a cellular modem
  'C8130-VAI-G2': { sd_wan: true, cellular: 'none' }, 'C8130-VAP-G2': { sd_wan: true, cellular: 'none' },
  // Meraki MX: the datasheets give 400 Mbps NGFW (detection) for the whole MX67/MX68 family and 200 tunnels for the MX85
  MX68: { }, MX85: { max_vpn_tunnels: 200 },
};

// ---- Licence texts
const LIC = {
  c8000: {
    required: null,
    tr: 'Veri sayfası lisans şartını belirtmiyor. Catalyst 8000 yönlendiriciler Cisco DNA yazılım aboneliğiyle siparişe girer; 250 Mbps üzerindeki şifreli trafik için HSEC lisansı gerekebilir. Bu modelde şartı Cisco iş ortağınıza doğrulatın.',
    en: 'The datasheet does not state the licence. Catalyst 8000 routers are ordered with a Cisco DNA software subscription; an HSEC licence may be needed for encrypted traffic above 250 Mbps. Confirm the requirement for this model with your Cisco partner.',
  },
  isr: {
    required: null,
    tr: 'Veri sayfası lisans zorunluluğunu belirtmiyor; Smart Licensing seçenekleri (APP ve SEC) listeleniyor. Kesin bilgi için Cisco iş ortağınıza danışın.',
    en: 'The datasheet does not state a mandatory licence; it lists Smart Licensing options (APP and SEC). Confirm with your Cisco partner.',
  },
  silent: {
    required: null,
    tr: 'Veri sayfası bir lisans zorunluluğundan söz etmiyor; kesin bilgi için Cisco iş ortağınıza danışın.',
    en: 'The datasheet does not mention a mandatory licence; confirm with your Cisco partner.',
  },
  mx: {
    required: true,
    tr: 'Lisans gerekir: her MX cihaz için Meraki lisansı (Enterprise, Advanced Security veya Secure SD-WAN Plus). Gelişmiş güvenlik (NGFW) hızı Advanced Security lisansına bağlıdır.',
    en: 'Licence required: a Meraki licence for every MX device (Enterprise, Advanced Security or Secure SD-WAN Plus). The next-generation firewall speed depends on the Advanced Security licence.',
  },
  vmx: {
    required: true,
    tr: 'Lisans gerekir: her vMX örneği için lisans şart (Enterprise veya Advanced Security; 1, 3 veya 5 yıl). Gelişmiş güvenlik (NGFW) hızı Advanced Security lisansına bağlıdır.',
    en: 'Licence required: every vMX instance needs a licence (Enterprise or Advanced Security; 1, 3 or 5 years). The next-generation firewall speed depends on the Advanced Security licence.',
  },
  z: {
    required: true,
    tr: 'Lisans gerekir: her Z-Series cihaz için Meraki lisansı gerekir.',
    en: 'Licence required: every Z-Series device needs a Meraki licence.',
  },
};

const VARIANT = {
  sdwan262: ['SD-WAN yazılımı IOS XE 26.2.1 ve sonrasında desteklenir (veri sayfası).', 'SD-WAN software is supported from IOS XE 26.2.1 (datasheet).'],
  vai: ['Sonu -VAI olan model ISDN üzerinden VDSL/ADSL (Annex B/J), -VAP olan model POTS üzerinden VDSL/ADSL (Annex A) için dahili DSL taşır. Kaynak: Catalyst 8100 veri sayfası.', 'The -VAI model has built-in DSL for VDSL/ADSL over ISDN (Annex B/J), the -VAP model for VDSL/ADSL over POTS (Annex A). Source: Catalyst 8100 datasheet.'],
  c8151c: ['Sonu -C olan modeller dahili 5G RedCap modemi (çift nano SIM) taşır. Kaynak: Catalyst 8100 veri sayfası.', 'Models ending in -C have a built-in 5G RedCap modem (dual nano SIM). Source: Catalyst 8100 datasheet.'],
  x8gb: ['PID\'deki X, uygulama barındırma için 8 GB DRAM anlamına gelir. Kaynak: ISR 1000 veri sayfası.', 'The X in the PID means 8 GB DRAM for application hosting. Source: ISR 1000 datasheet.'],
};

// ---- One entry per series. kind: what it is; intro: explainer above the models; aud: who it suits;
// perf: labels of the two throughput numbers; rec: the one hand-picked model.
const SERIES = {
  C8200: gen1('Catalyst 8200 (eski nesil)', 'Catalyst 8200 (previous generation)', 'C8200-1N-4T ve C8200L-1N-4T', DS.c8200),
  C8300: gen1('Catalyst 8300 (eski nesil)', 'Catalyst 8300 (previous generation)', 'C8300-2N2S ve C8300-1N1S modelleri', DS.c8300),
  C8500: gen1('Catalyst 8500 (eski nesil)', 'Catalyst 8500 (previous generation)', 'C8500-12X, C8500-12X4QC ve C8500-20X6C', DS.c8500),
  C8500L: gen1('Catalyst 8500L (eski nesil)', 'Catalyst 8500L (previous generation)', 'C8500L-8S4X', DS.c8500),
  'C8100-G2': {
    src: DS.c8100, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['Catalyst 8100 G2 güvenli yönlendirici', 'Catalyst 8100 G2 secure router'],
    intro: ['Catalyst 8100 G2: küçük şube ve ofisler için masaüstü veya rafa takılan güvenli yönlendiriciler; DSL, dahili 5G ve PoE seçenekleri vardır. ISR 1000 ve 1100 modellerinin yeni nesil karşılığıdır.', 'Catalyst 8100 G2: desktop or rack-mount secure routers for small branches and offices, with DSL, built-in 5G and PoE options. The next generation of the ISR 1000 and 1100 models.'],
    aud: ['Küçük şubeler ve ofisler; SD-WAN, güvenlik ve isteğe bağlı hücresel yedek hat gerekenler.', 'Small branches and offices that need SD-WAN, security and an optional cellular backup link.'],
    rec: ['C8151-G2', 'Küçük şube için 5,6 Gbps yönlendirme, SD-WAN ve takılabilir LTE/5G modülü.', '5.6 Gbps routing, SD-WAN and a pluggable LTE/5G module for a small branch.'],
  },
  'C8200-G2': {
    src: DS.c8200, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['Catalyst 8200 G2 güvenli yönlendirici', 'Catalyst 8200 G2 secure router'],
    intro: ['Catalyst 8200 G2: orta ölçekli şubeler için 19 Gbps yönlendirmeli, 10G WAN portlu, PoE ve mGig seçenekli güvenli yönlendiriciler.', 'Catalyst 8200 G2: secure routers for medium branches, with 19 Gbps routing, 10G WAN ports and PoE and mGig options.'],
    aud: ['Orta ölçekli şubeler ve küçük kampüsler; 10G internet hattı ve SD-WAN gerekenler.', 'Medium branches and small campuses that need a 10G internet link and SD-WAN.'],
    rec: ['C8231-G2', '19 Gbps yönlendirme, 10G WAN portları ve bir PoE+ portu; orta ölçekli şubeler için dengeli seçim.', '19 Gbps routing, 10G WAN ports and one PoE+ port; a balanced choice for medium branches.'],
  },
  'C8300-G2': {
    src: DS.c8300, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['Catalyst 8300 G2 güvenli yönlendirici', 'Catalyst 8300 G2 secure router'],
    intro: ['Catalyst 8300 G2: büyük şubeler ve bölge merkezleri için 38 Gbps yönlendirmeli, modül yuvalı güvenli yönlendiriciler.', 'Catalyst 8300 G2: secure routers for large branches and regional hubs, with 38 Gbps routing and module slots.'],
    aud: ['Büyük şubeler ve bölge merkezleri; yüksek SD-WAN ve şifreli trafik hızı gerekenler.', 'Large branches and regional hubs that need high SD-WAN and encrypted throughput.'],
    rec: ['C8375-E-G2', '38 Gbps yönlendirme, NIM ve SM yuvası ve takılabilir hücresel modül; modüler büyük şube için.', '38 Gbps routing, NIM and SM slots and a pluggable cellular module; for a modular large branch.'],
  },
  'C8400-G2': {
    src: DS.c8400, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['Catalyst 8400 G2 güvenli yönlendirici', 'Catalyst 8400 G2 secure router'],
    intro: ['Catalyst 8400 G2: veri merkezi ve büyük kampüs kenarı için 25G portlu, 67-91 Gbps yönlendirmeli güvenli yönlendiriciler.', 'Catalyst 8400 G2: secure routers for the edge of data centres and large campuses, with 25G ports and 67-91 Gbps routing.'],
    aud: ['Büyük kampüs ve bölge merkezleri; 10G/25G WAN hatları gerekenler.', 'Large campuses and regional hubs that need 10G/25G WAN links.'],
    rec: ['C8455-G2', '67 Gbps yönlendirme ve 25G portlar; hem şirket içi hem Meraki bulut yönetimiyle çalışabilir.', '67 Gbps routing and 25G ports; can run with on-premises or Meraki cloud management.'],
  },
  'C8500-G2': {
    src: DS.c8500, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['Catalyst 8500 G2 güvenli yönlendirici', 'Catalyst 8500 G2 secure router'],
    intro: ['Catalyst 8500 G2: veri merkezi ve WAN toplama noktaları için 115-190 Gbps yönlendirmeli güvenli yönlendiriciler.', 'Catalyst 8500 G2: secure routers for data centres and WAN aggregation points, with 115-190 Gbps routing.'],
    aud: ['Veri merkezi ve büyük WAN toplama noktaları.', 'Data centres and large WAN aggregation points.'],
    rec: ['C8550-G2', '12 x 10G WAN portu ve 115 Gbps yönlendirme; C8500-12X için Cisco\'nun önerdiği yedek.', '12 x 10G WAN ports and 115 Gbps routing; the replacement Cisco names for the C8500-12X.'],
  },
  'C8600-G2': {
    src: DS.c8600, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['Catalyst 8600 G2 güvenli yönlendirici', 'Catalyst 8600 G2 secure router'],
    intro: ['Catalyst 8600 G2: en büyük WAN toplama noktaları için 3 RU, 540 Gbps yönlendirmeli güvenli yönlendirici.', 'Catalyst 8600 G2: a 3 RU secure router with 540 Gbps routing for the largest WAN aggregation points.'],
    aud: ['Çok büyük veri merkezi ve operatör düzeyi WAN toplama noktaları.', 'Very large data centres and carrier-level WAN aggregation points.'],
    rec: null,
  },
  ISR1000: {
    src: DS.isr1000, lic: LIC.isr, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['ISR 1000 / 1100 tümleşik yönlendirici', 'ISR 1000 / 1100 integrated router'],
    intro: ['ISR 1000 ve 1100: küçük şube ve ofisler için masaüstü yönlendiriciler. Çoğu satıştan kalkıyor; güncel modeller C1121, C1126 ve C1127, yeni nesil karşılığı Catalyst 8100 G2\'dir.', 'ISR 1000 and 1100: desktop routers for small branches and offices. Most are being sold out; the current models are the C1121, C1126 and C1127, and the next generation is the Catalyst 8100 G2.'],
    aud: ['Küçük şube ve ofisler; 4-8 portlu LAN, isteğe bağlı PoE ve hücresel yedek hat.', 'Small branches and offices that need a 4-8 port LAN, optional PoE and a cellular backup link.'],
    rec: ['C1121-8P', '8 portlu LAN, çift WAN ve isteğe bağlı PoE; satıştan kalkan C1111-8P için Cisco\'nun önerdiği yedek.', '8 LAN ports, dual WAN and optional PoE; the replacement Cisco names for the end-of-sale C1111-8P.'],
  },
  C900: {
    src: DS.isr1000, lic: LIC.silent, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'),
    kind: ['ISR 900 tümleşik yönlendirici (satışı sona erdi)', 'ISR 900 integrated router (end of sale)'],
    intro: ['ISR 900 (C921, C926, C927, C931): satışı 28 Temmuz 2026\'da sona erdi; yerini ISR 1100 (C1121, C1126, C1127) aldı. Yalnızca eski kurulumları tanımak için listelenir.', 'ISR 900 (C921, C926, C927, C931): end of sale was 28 July 2026; replaced by the ISR 1100 (C1121, C1126, C1127). Listed only to recognise installed devices.'],
    aud: ['Mevcut kurulumlar; yeni projede C1121 / Catalyst 8100 G2 kullanın.', 'Existing installations; use the C1121 or Catalyst 8100 G2 for new projects.'],
    rec: null, eosAll: true,
  },
  MX67: mxs('MX67', 'Meraki MX67', DS.mx67, ['küçük şube ve ev ofisi', 'small branches and home offices'], ['MX67', 'Küçük şubeler için kablolu, 700 Mbps güvenlik duvarı ve Meraki bulut yönetimi.', 'A wired 700 Mbps firewall with Meraki cloud management for small branches.']),
  MX68: mxs('MX68', 'Meraki MX68', DS.mx67, ['PoE+ portlu küçük şubeler', 'small branches that need PoE+ ports'], ['MX68', 'Çift WAN ve iki PoE+ portlu; küçük şubeler için dengeli seçim.', 'Dual WAN and two PoE+ ports; a balanced choice for small branches.']),
  MX75: mxs('MX75', 'Meraki MX75', DS.mx75, ['orta ölçekli şube', 'medium branches'], null),
  MX84: mxs('MX84', 'Meraki MX84', DS.mx75, ['mevcut kurulumlar', 'existing installations'], null, true),
  MX85: mxs('MX85', 'Meraki MX85', DS.mx85, ['orta ölçekli şube', 'medium branches'], null),
  MX95: mxs('MX95', 'Meraki MX95', DS.mx95, ['büyük şube ve küçük kampüs', 'large branches and small campuses'], null),
  MX105: mxs('MX105', 'Meraki MX105', DS.mx95, ['büyük şube ve küçük kampüs', 'large branches and small campuses'], null),
  MX250: mxs('MX250', 'Meraki MX250', DS.mx250, ['kampüs ve bölge merkezi', 'campuses and regional hubs'], null),
  MX450: mxs('MX450', 'Meraki MX450', DS.mx450, ['büyük kampüs ve veri merkezi kenarı', 'large campuses and data-centre edges'], null),
  vMX: {
    src: DS.vmx, lic: LIC.vmx, perf: P('NAT / güvenlik duvarı', 'gelişmiş güvenlik (NGFW)', 'NAT / firewall', 'next-generation firewall (NGFW)'),
    kind: ['Meraki vMX sanal güvenlik cihazı', 'Meraki vMX virtual security appliance'],
    intro: ['Meraki vMX: AWS, Azure, Google Cloud ve Alibaba Cloud\'da çalışan sanal MX; bulut kaynaklarını Meraki SD-WAN ağına bağlar. S, M ve L boyutları vardır.', 'Meraki vMX: a virtual MX that runs in AWS, Azure, Google Cloud and Alibaba Cloud and connects cloud resources to the Meraki SD-WAN network. S, M and L sizes are available.'],
    aud: ['Bulutta (AWS, Azure, GCP) uygulaması olan Meraki ağları.', 'Meraki networks with applications in the cloud (AWS, Azure, GCP).'],
    rec: ['vMX-M', '500 Mbps NAT hızı ve 250 VPN tüneli; çoğu bulut bağlantısı için orta boy.', '500 Mbps NAT speed and 250 VPN tunnels; the middle size for most cloud connections.'],
  },
  'Z-Series': {
    src: 'https://documentation.meraki.com/SASE_and_SD-WAN/Z-Series_Teleworker_Gateways/Product_Information/Z4C_Datasheet', lic: LIC.z,
    perf: P('durum izlemeli güvenlik duvarı', 'güvenlik', 'stateful firewall', 'security'),
    kind: ['Meraki Z-Series uzaktan çalışan geçidi', 'Meraki Z-Series teleworker gateway'],
    intro: ['Meraki Z-Series: uzaktan çalışanlar için küçük, bulut yönetimli güvenlik geçidi; evden şirket ağına VPN kurar. Burada Z4C ile satışı sona eren Z3 modelleri listelenir; diğer Z-Series modelleri henüz eklenmedi.', 'Meraki Z-Series: small cloud-managed security gateways for teleworkers that build a VPN from home to the company network. Listed here are the Z4C and the Z3 models, which are end of sale; the other Z-Series models are not added yet.'],
    aud: ['Evden veya uzaktan çalışanlar; tek hat, dahili LTE yedek ve bir PoE+ portu.', 'Teleworkers who need a single link, a built-in LTE backup and one PoE+ port.'],
    rec: null,
  },
};

function P(trA, trB, enA, enB) { return { tr: [trA, trB], en: [enA ?? trA, enB ?? trB] }; }
function gen1(nameTr, nameEn, which, src) {
  return {
    src, lic: LIC.c8000, perf: P('yönlendirme', 'IPsec', 'forwarding', 'IPsec'), eosAll: true,
    kind: [`${nameTr} güvenli yönlendirici (satışı sona eriyor)`, `${nameEn} secure router (end of sale announced)`],
    intro: [`${nameTr}: ${which} için Cisco satış sonu duyurdu; yerine Catalyst 8000 G2 modelleri önerilir. Yeni projede kullanmayın, eski kurulumları tanımak için listelenir.`, `${nameEn}: Cisco announced end of sale for ${which}; the Catalyst 8000 G2 models are the suggested replacements. Do not use in new projects; listed to recognise installed devices.`],
    aud: ['Mevcut kurulumlar; yeni projede Catalyst 8000 G2 kullanın.', 'Existing installations; use the Catalyst 8000 G2 for new projects.'],
    rec: null,
  };
}
function mxs(name, label, src, forTr, rec, eos = false) {
  return {
    src, lic: LIC.mx, perf: P('durum izlemeli güvenlik duvarı', 'gelişmiş güvenlik (NGFW)', 'stateful firewall', 'next-generation firewall (NGFW)'),
    kind: [`${label} bulut yönetimli güvenlik cihazı${eos ? ' (satışı sona erdi)' : ''}`, `${label} cloud-managed security appliance${eos ? ' (end of sale)' : ''}`],
    intro: [`${label}: Meraki panosuyla yönetilen güvenlik duvarı ve SD-WAN cihazı; ${forTr[0]} için.${eos ? ' Satışı sona erdi; yerine MX85 önerilir.' : ''}`, `${label}: a firewall and SD-WAN appliance managed from the Meraki dashboard, for ${forTr[1]}.${eos ? ' End of sale; the MX85 is the suggested replacement.' : ''}`],
    aud: [eos ? 'Mevcut kurulumlar; yeni projede MX85 kullanın.' : `${cap(forTr[0])}; bulut yönetimli güvenlik ve SD-WAN.`, eos ? 'Existing installations; use the MX85 for new projects.' : `${cap(forTr[1])}; cloud-managed security and SD-WAN.`],
    rec, eosAll: eos,
  };
}
function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

// ---- Text templates
const trNum = (n) => String(n).replace('.', ',');
const rate = (mbps) => (mbps >= 1000 ? `${trNum(mbps / 1000)} Gbps` : `${mbps} Mbps`);
const enRate = (mbps) => (mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`);
const gT = (n) => `${trNum(n)}G`;

function copy(row, s, eos, showPerf) {
  if (eos && !s.eosAll) {
    s = { ...s, kind: [`${s.kind[0]} (satışı sona ${eos.last_order <= VERIFIED ? 'erdi' : 'eriyor'})`, `${s.kind[1]} (end of sale${eos.last_order <= VERIFIED ? '' : ' announced'})`], aud: ['Mevcut kurulumlar; yeni projede bülteninin önerdiği yedeği kullanın.', 'Existing installations; use the replacement named in the bulletin for new projects.'] };
  }
  const [l1t, l2t] = s.perf.tr;
  const [l1e, l2e] = s.perf.en;
  const wanT = row.wan_port_count ? `${row.wan_port_count} WAN portu${row.wan_port_max_gbps ? ` (en fazla ${gT(row.wan_port_max_gbps)})` : ''}` : 'WAN portu: belirtilmemiş';
  const wanE = row.wan_port_count ? `${row.wan_port_count} WAN port${row.wan_port_count > 1 ? 's' : ''}${row.wan_port_max_gbps ? ` (up to ${row.wan_port_max_gbps}G)` : ''}` : 'WAN ports: not stated';
  const perfT = `${l1t} ${rate(row.throughput_mbps)}${row.security_throughput_mbps ? `, ${l2t} ${rate(row.security_throughput_mbps)}` : ''}`;
  const perfE = `${l1e} ${enRate(row.throughput_mbps)}${row.security_throughput_mbps ? `, ${l2e} ${enRate(row.security_throughput_mbps)}` : ''}`;
  const cellT = { none: '', embedded: ' Dahili hücresel (LTE/5G) modem.', pluggable: ' Takılabilir hücresel (LTE/5G) modül desteği.' }[row.cellular] ?? '';
  const cellE = { none: '', embedded: ' Built-in cellular (LTE/5G) modem.', pluggable: ' Supports a pluggable cellular (LTE/5G) module.' }[row.cellular] ?? '';
  const sdT = row.sd_wan ? ' SD-WAN destekler.' : '';
  const sdE = row.sd_wan ? ' Supports SD-WAN.' : '';
  const poeT = row.poe ? ' PoE verebilen portları var.' : '';
  const poeE = row.poe ? ' Has ports that can supply PoE.' : '';
  return {
    // An End-of-Sale row whose speed was not re-verified shows no speed in its summary.
    summary_tr: `${s.kind[0]}: ${wanT}${showPerf ? `; ${perfT}` : ''}.${cellT}${sdT}${poeT}`,
    summary_en: `${s.kind[1]}: ${wanE}${showPerf ? `; ${perfE}` : ''}.${cellE}${sdE}${poeE}`,
    good_for_tr: s.aud[0],
    good_for_en: s.aud[1],
  };
}

// ---- Run
const { sheets } = await readWorkbook(workbookPath('routing'), 'routing');
const byPid = new Map(sheets.models.map((m) => [m.pid, m]));
const corrections = [];
const note = (pid, field, from, to) => {
  if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) corrections.push(`${pid}: ${field} ${JSON.stringify(from ?? null)} -> ${JSON.stringify(to)}`);
};

let touched = 0;
for (const [seriesName, s] of Object.entries(SERIES)) {
  const rows = sheets.models.filter((m) => m.series === seriesName && m.scope !== 'excluded');
  if (!rows.length) throw new Error(`Series ${seriesName} has no rows`);
  for (const row of rows) {
    if (NOT_READY[row.pid]) continue;
    const eos = EOS[row.pid] ? { ...BUL[EOS[row.pid][0]], ...EOS[row.pid][1] } : null;
    if (s.eosAll && !eos) throw new Error(`${row.pid}: End-of-Sale series without a bulletin`);
    const before = { sd_wan: row.sd_wan, cellular: row.cellular, wan_port_count: row.wan_port_count, wan_port_max_gbps: row.wan_port_max_gbps, throughput_mbps: row.throughput_mbps, security_throughput_mbps: row.security_throughput_mbps, nim_slots: row.nim_slots, sm_slots: row.sm_slots, pim_slots: row.pim_slots, max_vpn_tunnels: row.max_vpn_tunnels };

    if (PERF[row.pid]) {
      [row.throughput_mbps, row.security_throughput_mbps] = PERF[row.pid];
    } else if (eos) {
      row.security_throughput_mbps = null; // End-of-Sale rows keep the legacy forwarding number only
    } else {
      throw new Error(`${row.pid}: no verified performance`);
    }
    Object.assign(row, PATCH[row.pid] ?? {});
    if (!row.cellular) row.cellular = 'none';
    for (const key of Object.keys(before)) note(row.pid, key, before[key], row[key]);

    const text = copy(row, s, eos, Boolean(PERF[row.pid]));
    const parts = [];
    if (/^C8130-VA[IP]-G2$/.test(row.pid)) parts.push(VARIANT.vai);
    if (/^C8151-CVA[IP]-G2$|^C8151H-C-G2$/.test(row.pid)) parts.push(VARIANT.c8151c);
    if (/^C8130|^C8140/.test(row.pid)) parts.push(VARIANT.sdwan262);
    if (/^C112[1-7]X-/.test(row.pid)) parts.push(VARIANT.x8gb);
    const verified = Boolean(PERF[row.pid]);
    const ds = verified ? s.src : row.datasheet_url;
    Object.assign(row, {
      ...text,
      licence_required: s.lic.required, licence_note_tr: s.lic.tr, licence_note_en: s.lic.en,
      variant_note_tr: parts.length ? parts.map((x) => x[0]).join(' ') : null, variant_note_en: parts.length ? parts.map((x) => x[1]).join(' ') : null,
      datasheet_url: ds, source_url: verified ? s.src : eos.url,
      last_verified: VERIFIED, added_date: ADDED, needs_data: null, status: 'ready',
    });

    if (eos) {
      row.lifecycle = eos.last_order <= VERIFIED ? 'eos' : 'eos_announced';
      Object.assign(row, {
        eos_announced: eos.announced, last_order: eos.last_order, ldos: eos.ldos, eol_bulletin_url: eos.url,
        replacement_pid: eos.repl ?? null, replacement_note: eos.note ? eos.note[0] : null, replacement_note_en: eos.note ? eos.note[1] : null, replacement_none: eos.none ? true : null,
      });
    } else {
      row.lifecycle = 'current';
      Object.assign(row, { eos_announced: null, last_order: null, ldos: null, replacement_pid: null, replacement_note: null, replacement_note_en: null, replacement_none: null, eol_bulletin_url: null });
    }
    row.unified = row.management.includes('on_prem') && row.management.includes('cloud');
    row.recommended = null; row.recommended_why_tr = null; row.recommended_why_en = null;
    if (s.rec && s.rec[0] === row.pid) {
      row.recommended = true; row.recommended_why_tr = s.rec[1]; row.recommended_why_en = s.rec[2];
    }
    touched += 1;
  }
  if (s.rec && !byPid.get(s.rec[0])) throw new Error(`Recommended ${s.rec[0]} does not exist`);
}

for (const [pid, why] of Object.entries(NOT_READY)) {
  const row = byPid.get(pid);
  if (!row) throw new Error(`Unknown PID ${pid}`);
  row.status = 'draft';
  row.needs_data = why;
}
for (const pid of Object.keys(EOS)) if (!byPid.get(pid)) throw new Error(`EOS table lists unknown PID ${pid}`);

const seriesByName = new Map(sheets.series.map((r) => [r.series, r]));
for (const [name, s] of Object.entries(SERIES)) {
  const r = seriesByName.get(name);
  if (!r) throw new Error(`Unknown series ${name}`);
  Object.assign(r, { series_intro_tr: s.intro[0], series_intro_en: s.intro[1], status: 'ready' });
}

await writeWorkbook(workbookPath('routing'), 'routing', sheets);
const ready = sheets.models.filter((m) => m.status === 'ready').length;
console.log(`routing.xlsx: ${touched} rows filled, ${ready} ready, ${sheets.models.length - ready} not ready (draft or excluded)`);
console.log(`\nCorrections to the legacy values (${corrections.length}):`);
for (const c of corrections) console.log(`  ${c}`);
