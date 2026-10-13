// Phase 4 data pass for switching.xlsx: the core SMB set, verified against Cisco and Meraki datasheets and
// End-of-Sale bulletins on 2026-10-13. The evidence per series is in docs/Phase4_Switching_Verification.md.
// Turkish and English text is generated from the verified specs with fixed templates (so every model reads
// the same way) plus a hand-written explainer per series; it needs native review. Nothing is invented: where
// a source was silent the field is left empty and the row stays draft (see NOT_READY).
//
// Run once: node scripts/build-data/fill/switching-pass1.mjs   (idempotent: it sets the same values again)

import { readWorkbook, writeWorkbook } from '../xlsx-io.mjs';
import { workbookPath } from '../catalog.mjs';

const VERIFIED = '2026-10-13';
const ADDED = '2026-10-13';

// Real datasheets (the legacy links pointed at series listing pages).
const DS = {
  c1200: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-1200-series-switches/nb-06-cat1200-ser-data-sheet-cte-en.html',
  c1300: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-1300-series-switches/nb-06-cat1300-ser-data-sheet-cte-en.html',
  c9200: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9200-series-switches/nb-06-cat9200-ser-data-sheet-cte-en.html',
  c9300: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9300-series-switches/nb-06-cat9300-ser-data-sheet-cte-en.html',
  m9200L: 'https://documentation.meraki.com/Switching/Cloud_Management_with_IOS_XE/Product_Information/Overviews_and_Datasheets/Catalyst_9200L-M_Datasheet',
  m9300: 'https://documentation.meraki.com/MS/Product_Information/Overviews_and_Datasheets/Catalyst_9300-M_datasheet',
  m9300L: 'https://documentation.meraki.com/Switching/Cloud_Management_with_IOS_XE/Product_Information/Overviews_and_Datasheets/Catalyst_9300L-M_Datasheet',
  m9300X: 'https://documentation.meraki.com/Switching/Cloud_Management_with_IOS_XE/Product_Information/Overviews_and_Datasheets/Catalyst_9300X-M_Datasheet',
  ms130: 'https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS130_Datasheet',
  ms130r: 'https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS130R_Datasheet',
  ms150: 'https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS150_Datasheet',
  ms210: 'https://documentation.meraki.com/Switching/MS_-_Switches/Product_Information/Overviews_and_Datasheets/MS210_Overview_and_Specifications',
  ms450: 'https://documentation.meraki.com/Switching/MS_-_Switches/Install_and_Get_Started/Installation_Guides/MS450_Series_Installation_Guide',
  cbs220: 'https://www.cisco.com/c/en/us/products/collateral/switches/business-220-series-smart-switches/datasheet-c78-744915.html',
  c9500: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9500-series-switches/nb-06-cat9500-ser-data-sheet-cte-en.html',
  c9500eol: 'https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9500-series-switches/c9500-16x-switch-nm-c9500-nm-8x-nm-2q-eol.html',
};

const BULLETIN = {
  ms210: 'https://documentation.meraki.com/@api/deki/files/35119/MS210_EOS_PDF.pdf?revision=1',
  ms450: 'https://www.cisco.com/c/en/us/products/collateral/networking/switches/meraki-switches/meraki-ms450-12x40g-aggregation-switch-eol.html',
  c9500: DS.c9500eol,
};

// Rows that stay draft, with the reason (copied into needs_data and docs/Phase4_Switching_Needs.md).
const NOT_READY = {
  'C1200-8T-D': 'The datasheet lists no uplink ports for this desktop model, so uplink_gbps cannot be filled. Decide how to show a switch without uplinks.',
  'C1300-12XS': 'All-10G model: the datasheet gives no separate uplink ports, so uplink_gbps cannot be filled. Decide how to show an all-10G aggregation switch.',
  'C1300-16XTS': 'All-10G model: the datasheet gives no separate uplink ports, so uplink_gbps cannot be filled. Decide how to show an all-10G aggregation switch.',
  'C1300-24XS': 'All-10G model: the datasheet gives no separate uplink ports, so uplink_gbps cannot be filled. Decide how to show an all-10G aggregation switch.',
  'C1300-24XT': 'All-10G model: the datasheet gives no separate uplink ports, so uplink_gbps cannot be filled. Decide how to show an all-10G aggregation switch.',
  'C1300-24XTS': 'All-10G model: the datasheet gives no separate uplink ports, so uplink_gbps cannot be filled. Decide how to show an all-10G aggregation switch.',
};

// ---- PoE budget in watts with the default power supply (psu = default supply in watts, w2 = with a second one)
const P = (w, psu = null, w2 = null) => ({ w, psu, w2 });
const POE = {
  // Catalyst 1200 (fixed budget)
  'C1200-8P-E-2G': P(67), 'C1200-8FP-2G': P(120), 'C1200-16P-2G': P(120), 'C1200-24P-4G': P(195), 'C1200-24FP-4G': P(375),
  'C1200-48P-4G': P(375), 'C1200-24P-4X': P(195), 'C1200-24FP-4X': P(375), 'C1200-48P-4X': P(375),
  // Catalyst 1300 / 1300X. Four 1300 models show 375 W in the PoE table and 370 W in the ordering table: the lower value is used.
  'C1300-8P-E-2G': P(67), 'C1300-8FP-2G': P(120), 'C1300-16P-2G': P(120), 'C1300-16FP-2G': P(240), 'C1300-24P-4G': P(195),
  'C1300-24FP-4G': P(370), 'C1300-48P-4G': P(370), 'C1300-48FP-4G': P(740), 'C1300-16P-4X': P(120), 'C1300-24P-4X': P(195),
  'C1300-24FP-4X': P(370), 'C1300-48P-4X': P(370), 'C1300-48FP-4X': P(740), 'C1300-8MGP-2X': P(120), 'C1300-24MGP-4X': P(375),
  'C1300-48MGP-4X': P(740), 'C1300X-24P-4X': P(385), 'C1300X-48P-4X': P(740), 'C1300X-24MU-4X': P(740), 'C1300X-10NU-2X': P(385),
  'C1300X-24NGU-4X': P(740), 'C1300X-48NGU-4X': P(740),
  // Catalyst 9200 (modular power supplies)
  'C9200-24P': P(370, 600, 740), 'C9200-24PB': P(370, 600, 740), 'C9200-24PXG': P(370, 600, 740), 'C9200-48P': P(740, 1000, 1440),
  'C9200-48PB': P(740, 1000, 1440), 'C9200-48PXG': P(740, 1000, 1440), 'C9200-48PL': P(370, 600, 740),
  'C9200L-24P-4G': P(370, 600, 740), 'C9200L-24P-4X': P(370, 600, 740), 'C9200L-48P-4G': P(740, 1000, 1440),
  'C9200L-48PL-4G': P(370, 600, 740), 'C9200L-48P-4X': P(740, 1000, 1440), 'C9200L-48PL-4X': P(370, 600, 740),
  'C9200L-24PXG-4X': P(370, 600, 740), 'C9200L-48PXG-4X': P(740, 1000, 1440), 'C9200L-24PXG-2Y': P(370, 600, 740),
  'C9200L-48PXG-2Y': P(740, 1000, 1440),
  'C9200CX-12P-2X2G': P(240, 315), 'C9200CX-8P-2X2G': P(240, 315), 'C9200CX-8UXG-2X': P(240, 315), 'C9200CX-12P-2XGH': P(240, 315),
  'C9200CX-8P-2XGH': P(240, 315), 'C9200CX-8UXG-2XH': P(240, 315), 'C9200CX-8PT-2G': P(180, 80, 240),
  // Catalyst 9300 / 9300L / 9300X
  'C9300-24P': P(445, 715, 720), 'C9300-24U': P(830, 1100, 1440), 'C9300-24UB': P(830, 1100, 1440), 'C9300-24H': P(830, 1100, 1930),
  'C9300-24UX': P(560, 1100, 1440), 'C9300-24UXB': P(560, 1100, 1440), 'C9300-48P': P(437, 715, 1152), 'C9300-48U': P(822, 1100, 1800),
  'C9300-48UB': P(822, 1100, 1800), 'C9300-48H': P(822, 1100, 1922), 'C9300-48UXM': P(490, 1100, 1590), 'C9300-48UN': P(645, 1100, 1745),
  'C9300X-24HX': P(735, 1100, 1835), 'C9300X-48HX': P(590, 1100, 1690), 'C9300X-48HXN': P(690, 1100, 1790),
  'C9300L-24P-4G': P(505, 715, 720), 'C9300L-24P-4X': P(505, 715, 720), 'C9300L-48P-4G': P(505, 715, 1220), 'C9300L-48P-4X': P(505, 715, 1220),
  'C9300L-48PF-4G': P(890, 1100, 1440), 'C9300L-48PF-4X': P(890, 1100, 1440), 'C9300L-24UXG-4X': P(880, 1100, 1440),
  'C9300L-24UXG-2Q': P(722, 1100, 1440), 'C9300L-48UXG-4X': P(675, 1100, 1775), 'C9300L-48UXG-2Q': P(675, 1100, 1775),
  'C9300LM-48UX-4Y': P(790, 1000, 1790), 'C9300LM-24U-4Y': P(420, 600, 1020),
  // Meraki MS130 / MS130R / MS150 / MS210 (fixed budget)
  'MS130-8P-HW': P(120), 'MS130-8P-I-HW': P(120), 'MS130-8X-HW': P(120), 'MS130-12X-HW': P(240), 'MS130-24P-HW': P(370),
  'MS130-24X-HW': P(370), 'MS130-48P-HW': P(740), 'MS130-48X-HW': P(740), 'MS130R-8P-HW': P(240),
  'MS150-24P-4G': P(370), 'MS150-24P-4X': P(370), 'MS150-24MP-4X': P(370), 'MS150-48LP-4G': P(370), 'MS150-48FP-4G': P(740),
  'MS150-48LP-4X': P(370), 'MS150-48FP-4X': P(740), 'MS150-48MP-4X': P(740),
  'MS210-24P-HW': P(370), 'MS210-48LP-HW': P(370), 'MS210-48FP-HW': P(740),
  // Cisco Business 220
  'CBS220-8P-E-2G': P(65), 'CBS220-8FP-E-2G': P(130), 'CBS220-16P-2G': P(130), 'CBS220-24P-4G': P(195), 'CBS220-24FP-4G': P(382),
  'CBS220-48P-4G': P(382), 'CBS220-24P-4X': P(195), 'CBS220-24FP-4X': P(382), 'CBS220-48P-4X': P(382), 'CBS220-48FP-4X': P(740),
};
// The Meraki-mode (-M) Catalyst models have the same budgets as their IOS XE twins (checked in the -M datasheets).
for (const pid of Object.keys(POE)) POE[`${pid}-M`] = POE[pid];

// ---- Stacking in the Catalyst 1300 datasheet's stacking list (the -2G and -4G models are not on it)
const C1300_STACK = new Set([
  'C1300-16P-4X', 'C1300-24T-4X', 'C1300-24P-4X', 'C1300-24FP-4X', 'C1300-48T-4X', 'C1300-48P-4X', 'C1300-48FP-4X',
  'C1300-8MGP-2X', 'C1300-24MGP-4X', 'C1300-48MGP-4X', 'C1300-12XT-2X',
  'C1300X-24T-4X', 'C1300X-24P-4X', 'C1300X-48T-4X', 'C1300X-48P-4X', 'C1300X-10NU-2X',
]);

// ---- Per-PID corrections to the legacy specs (each one is reported in the console and the verification doc)
const PATCH = {
  // MS130 "X" models are PoE+ models in the datasheet (the legacy file had no PoE for them)
  'MS130-8X-HW': { poe_type: 'poe_plus' }, 'MS130-12X-HW': { poe_type: 'poe_plus' },
  'MS130-24X-HW': { poe_type: 'poe_plus' }, 'MS130-48X-HW': { poe_type: 'poe_plus' },
  // MS150 "MP" models: mGig ports are 5G and the 60 W ports are 802.3bt (UPOE-class)
  // Catalyst 9500: StackWise Virtual pairs two switches, there is no physical stacking; the uplinks are 40/100G
  'C9500-24Y4C': { stacking: false, uplink_gbps: [40, 100] },
  'MS150-24MP-4X': { downlink_gbps: [5], poe_type: 'upoe' }, 'MS150-48MP-4X': { downlink_gbps: [5], poe_type: 'upoe' },
};

const POE_NOTES = {
  'MS150-24MP-4X': ['60 W (PoE++) yalnızca 17-24 numaralı portlarda; diğer portlar port başına en fazla 30 W verir.', '60 W (PoE++) is only on ports 17-24; the other ports give up to 30 W each.'],
  'MS150-48MP-4X': ['60 W (PoE++) yalnızca 33-48 numaralı portlarda; diğer portlar port başına en fazla 30 W verir.', '60 W (PoE++) is only on ports 33-48; the other ports give up to 30 W each.'],
  'C9200CX-8PT-2G': ['Bu model gücünü yukarı bağlantılardaki UPOE+ ve harici adaptörden alır: 80 W adaptörle 180 W, 150 W adaptörle 240 W PoE verir.', 'This model takes its power from UPOE+ on its uplinks and an external adapter: 180 W of PoE with the 80 W adapter, 240 W with the 150 W adapter.'],
  'C1300-24FP-4G': ['Veri sayfasında 370 W ile 375 W arasında farklı değerler var; planlamada düşük değer (370 W) kullanıldı.', 'The datasheet gives both 370 W and 375 W; the lower value (370 W) is used for planning.'],
  'C1300-48P-4G': ['Veri sayfasında 370 W ile 375 W arasında farklı değerler var; planlamada düşük değer (370 W) kullanıldı.', 'The datasheet gives both 370 W and 375 W; the lower value (370 W) is used for planning.'],
  'C1300-24FP-4X': ['Veri sayfasında 370 W ile 375 W arasında farklı değerler var; planlamada düşük değer (370 W) kullanıldı.', 'The datasheet gives both 370 W and 375 W; the lower value (370 W) is used for planning.'],
  'C1300-48P-4X': ['Veri sayfasında 370 W ile 375 W arasında farklı değerler var; planlamada düşük değer (370 W) kullanıldı.', 'The datasheet gives both 370 W and 375 W; the lower value (370 W) is used for planning.'],
};

// ---- Licence texts
const LIC = {
  cat9k: {
    required: true,
    tr: 'Lisans gerekir: Cisco Catalyst (veya Cisco DNA) aboneliği, ağ lisansıyla aynı seviyede (Network Essentials veya Network Advantage). Siparişte zorunludur.',
    en: 'Licence required: a Cisco Catalyst (or Cisco DNA) subscription at the same tier as the network licence (Network Essentials or Network Advantage). It is mandatory when you order.',
  },
  cat9kM: {
    required: true,
    tr: 'Lisans gerekir: Catalyst 9000-M lisansı (Enterprise veya Advanced), cihaz başına; 1, 3, 5, 7 veya 10 yıl süreli. Cisco Meraki panosu gerekir.',
    en: 'Licence required: a Catalyst 9000-M licence (Enterprise or Advanced) per device, in 1, 3, 5, 7 or 10-year terms. The Cisco Meraki dashboard is required.',
  },
  ms130: {
    required: true,
    tr: 'Lisans gerekir: Meraki anahtar lisansı (Enterprise veya Advanced), cihaz başına; Enterprise 1-10 yıl, Advanced 1-5 yıl süreli.',
    en: 'Licence required: a Meraki switch licence (Enterprise or Advanced) per device; Enterprise in 1-10 year terms, Advanced in 1-5 year terms.',
  },
  ms150: {
    required: true,
    tr: 'Lisans gerekir: Meraki anahtar lisansı (Enterprise veya Advanced), cihaz başına.',
    en: 'Licence required: a Meraki switch licence (Enterprise or Advanced) per device.',
  },
  silent: {
    required: null,
    tr: 'Veri sayfası bir lisans veya abonelik zorunluluğundan söz etmiyor; kesin bilgi için Cisco iş ortağınıza danışın.',
    en: 'The datasheet does not mention a mandatory licence or subscription; confirm with your Cisco partner.',
  },
};

// ---- Notes on what a PID suffix means
const VAR = {
  m: [
    'Sonu -M olan PID Meraki panosuyla (bulut) yönetilir; -M eksiz Catalyst PID IOS XE ile şirket içinde yönetilir. Kaynak: Meraki Catalyst -M veri sayfası.',
    'A PID ending in -M is managed from the Meraki dashboard (cloud); the same Catalyst PID without -M is managed on-premises with IOS XE. Source: Meraki Catalyst -M datasheet.',
  ],
  cat9kMeraki: [
    'Bu anahtar Meraki yazılımına geçirilebilir (Meraki lisansı ve Meraki panosu gerekir). Meraki modunda baştan sipariş vermek için sonu -M olan PID kullanılır. Kaynak: Cisco Catalyst 9300 veri sayfası.',
    'This switch can be migrated to the Meraki software option (a Meraki licence and the Meraki dashboard are required). To order it in Meraki mode from the start, use the PID ending in -M. Source: Cisco Catalyst 9300 datasheet.',
  ],
  cat9200Meraki: [
    'Bu anahtar Meraki panosuna geçirilebilir; Meraki modunda baştan sipariş vermek için sonu -M olan PID kullanılır. Kaynak: Cisco Catalyst 9200 veri sayfası.',
    'This switch can be migrated to the Meraki dashboard; to order it in Meraki mode from the start, use the PID ending in -M. Source: Cisco Catalyst 9200 datasheet.',
  ],
  ea: [
    'Sipariş PID\'sinin sonuna ağ lisansı seviyesi eklenir: -E (Network Essentials) veya -A (Network Advantage). Kaynak: Cisco Catalyst 9200 veri sayfası.',
    'The ordering PID gets the network licence tier as a suffix: -E (Network Essentials) or -A (Network Advantage). Source: Cisco Catalyst 9200 datasheet.',
  ],
};

// ---- One entry per series. kind: [tr, en] what it is; intro: [tr, en] explainer above the models;
// aud: [tr, en] who it suits; rec: [pid, why_tr, why_en] the one hand-picked model.
const SERIES = {
  C1200: {
    src: DS.c1200, lic: LIC.silent, l3: 'basic_l3',
    kind: ['Catalyst 1200 yönetilebilir anahtar', 'Catalyst 1200 managed switch'],
    intro: ['Catalyst 1200: küçük ofis ve şubeler için temel, kolay kurulan yönetilebilir anahtarlar. 1G portlar, isteğe bağlı PoE+ ve sabit yukarı bağlantı.', 'Catalyst 1200: basic, easy-to-set-up managed switches for small offices and branches. 1G ports, optional PoE+ and fixed uplinks.'],
    aud: ['Küçük ofis, mağaza ve şubeler; basit VLAN ve PoE ihtiyacı.', 'Small offices, shops and branches with simple VLAN and PoE needs.'],
    rec: ['C1200-24P-4G', 'Küçük bir ofisin telefon, kamera ve erişim noktaları için yeterli PoE+ ve 24 port.', 'Enough PoE+ and 24 ports for the phones, cameras and access points of a small office.'],
  },
  C1300: {
    src: DS.c1300, lic: LIC.silent, l3: 'basic_l3',
    kind: ['Catalyst 1300 yönetilebilir anahtar', 'Catalyst 1300 managed switch'],
    intro: ['Catalyst 1300: küçük ve orta ofisler için, 10G yukarı bağlantılı, yığınlanabilir ve çok hızlı (mGig) PoE seçenekleri olan yönetilebilir anahtarlar.', 'Catalyst 1300: managed switches for small and medium offices, with 10G uplinks, stackable models and multigigabit (mGig) PoE options.'],
    aud: ['Küçük ve orta ofisler; 10G yukarı bağlantı, yığınlama veya çok hızlı (mGig) port gerekenler.', 'Small and medium offices that need a 10G uplink, stacking or multigigabit (mGig) ports.'],
    rec: ['C1300-24FP-4X', '24 portun hepsine PoE+ verir (370 W) ve 10G yukarı bağlantısı ile yığınlama destekler.', 'Gives PoE+ on all 24 ports (370 W), with a 10G uplink and stacking.'],
  },
  C1300X: {
    src: DS.c1300, lic: LIC.silent, l3: 'basic_l3',
    kind: ['Catalyst 1300X yönetilebilir anahtar', 'Catalyst 1300X managed switch'],
    intro: ['Catalyst 1300X: 1300 serisinin 10G (SFP28) yukarı bağlantılı, OSPF yönlendirme destekli üst modelleri; 5G ve 60 W PoE seçenekleri vardır.', 'Catalyst 1300X: the higher models of the 1300 series, with 10G (SFP28) uplinks and OSPF routing; 5G and 60 W PoE options are available.'],
    aud: ['Ağın omurgasına yakın küçük ve orta işletmeler; OSPF ve 10G yukarı bağlantı gerekenler.', 'Small and medium businesses that need OSPF and 10G uplinks.'],
    rec: ['C1300X-24P-4X', '24 port PoE+ (385 W), 10G yukarı bağlantı, yığınlama ve OSPF bir arada.', '24 PoE+ ports (385 W), 10G uplinks, stacking and OSPF together.'],
  },
  C9200L: {
    src: DS.c9200, lic: LIC.cat9k, variant: VAR.cat9200Meraki, vea: VAR.ea,
    kind: ['Catalyst 9200L kurumsal erişim anahtarı', 'Catalyst 9200L enterprise access switch'],
    intro: ['Catalyst 9200L: Catalyst 9000 ailesine KOBİ giriş noktası. Sabit yukarı bağlantılı, yığınlanabilir kurumsal erişim anahtarı; Meraki panosuyla da yönetilebilir.', 'Catalyst 9200L: the SMB entry into the Catalyst 9000 family. A stackable enterprise access switch with fixed uplinks, which can also be managed from the Meraki dashboard.'],
    aud: ['Şube ve küçük-orta işletmeler; kurumsal özellikler (Catalyst Center, güvenlik) gerekenler.', 'Branches and small-to-medium businesses that need enterprise features (Catalyst Center, security).'],
    rec: ['C9200L-24P-4X', '24 port PoE+ (370 W, ikinci güç kaynağıyla 740 W) ve 10G yukarı bağlantı; çoğu şube için yeterli.', '24 PoE+ ports (370 W, 740 W with a second power supply) and a 10G uplink; enough for most branches.'],
  },
  C9200: {
    src: DS.c9200, lic: LIC.cat9k, variant: null, vea: VAR.ea,
    kind: ['Catalyst 9200 kurumsal erişim anahtarı', 'Catalyst 9200 enterprise access switch'],
    intro: ['Catalyst 9200: modüler yukarı bağlantılı (ağ modülü) Catalyst 9000 erişim anahtarı; yığınlanabilir, kurumsal güvenlik ve yönetim özellikleri vardır.', 'Catalyst 9200: a Catalyst 9000 access switch with modular uplinks (network module); stackable, with enterprise security and management features.'],
    aud: ['Yukarı bağlantı hızını sonradan seçmek isteyen orta ölçekli işletmeler ve şubeler.', 'Mid-size businesses and branches that want to choose the uplink speed with a module.'],
    rec: ['C9200-24P', '24 port PoE+ ve ağ modülüyle seçilebilir yukarı bağlantı; Catalyst 9200 ailesinin temel modeli.', '24 PoE+ ports and an uplink you choose with a network module; the core model of the Catalyst 9200 family.'],
  },
  C9200CX: {
    src: DS.c9200, lic: LIC.cat9k, variant: null,
    kind: ['Catalyst 9200CX kompakt anahtar', 'Catalyst 9200CX compact switch'],
    intro: ['Catalyst 9200CX: fansız, kompakt Catalyst 9000 anahtarı. Masa altı, tavan üstü veya küçük odalar gibi sessiz çalışması gereken yerler için; yığınlanmaz.', 'Catalyst 9200CX: a fanless, compact Catalyst 9000 switch for quiet places such as under a desk, above a ceiling or in small rooms; it does not stack.'],
    aud: ['Ofis içi, otel odası veya mağaza gibi sessiz ve dar alanlar; 8-12 portluk ihtiyaç.', 'Quiet, tight spaces such as offices, hotel rooms or shops that need 8-12 ports.'],
    rec: ['C9200CX-12P-2X2G', '12 portun çoğuna PoE+ verir (240 W), 10G yukarı bağlantılı ve fansızdır.', 'PoE+ on most of its 12 ports (240 W), with 10G uplinks, and fanless.'],
  },
  C9300: {
    src: DS.c9300, lic: LIC.cat9k, variant: VAR.cat9kMeraki,
    kind: ['Catalyst 9300 kurumsal erişim anahtarı', 'Catalyst 9300 enterprise access switch'],
    intro: ['Catalyst 9300: kurumsal ağlar için yığınlanabilir, modüler yukarı bağlantılı erişim anahtarı. UPOE (60 W) ve UPOE+ (90 W) ile çok hızlı (mGig) seçenekleri vardır.', 'Catalyst 9300: a stackable enterprise access switch with modular uplinks. UPOE (60 W) and UPOE+ (90 W) and multigigabit (mGig) options are available.'],
    aud: ['Orta ve büyük ofis, kampüs ve şubeler; yüksek PoE bütçesi, yığınlama ve kurumsal güvenlik gerekenler.', 'Medium and large offices, campuses and branches that need a high PoE budget, stacking and enterprise security.'],
    rec: ['C9300-48P', '48 port PoE+ ve ağ modülüyle seçilebilir yukarı bağlantı; bu serinin en yaygın modeli.', '48 PoE+ ports and an uplink chosen with a network module; the most common model in this series.'],
  },
  C9300L: {
    src: DS.c9300, lic: LIC.cat9k, variant: VAR.cat9kMeraki,
    kind: ['Catalyst 9300L kurumsal erişim anahtarı', 'Catalyst 9300L enterprise access switch'],
    intro: ['Catalyst 9300L: Catalyst 9300\'ün sabit yukarı bağlantılı sürümü (1G, 10G, 40G veya 25G). Yığınlama için ayrı yığın kiti gerekir.', 'Catalyst 9300L: the fixed-uplink version of the Catalyst 9300 (1G, 10G, 40G or 25G). A separate stack kit is needed for stacking.'],
    aud: ['Yukarı bağlantısı sabit olabilen orta ölçekli ofis ve şubeler; kurumsal özellikler gerekenler.', 'Mid-size offices and branches that can use fixed uplinks and need enterprise features.'],
    rec: ['C9300L-24P-4X', '24 port PoE+ (505 W) ve 10G yukarı bağlantı; çoğu orta ölçekli ofis için dengeli seçim.', '24 PoE+ ports (505 W) and a 10G uplink; a balanced choice for most mid-size offices.'],
  },
  C9300X: {
    src: DS.c9300, lic: LIC.cat9k, variant: VAR.cat9kMeraki,
    kind: ['Catalyst 9300X kurumsal erişim anahtarı', 'Catalyst 9300X enterprise access switch'],
    intro: ['Catalyst 9300X: serinin en güçlüsü. 100G yukarı bağlantı, 10G/25G portlar ve UPOE+ (90 W) ile 1 Tbps yığınlama.', 'Catalyst 9300X: the most powerful of the series. 100G uplinks, 10G/25G ports and UPOE+ (90 W), with 1 Tbps stacking.'],
    aud: ['Wi-Fi 7 erişim noktaları ve yoğun PoE yükü olan büyük ofis ve kampüsler.', 'Large offices and campuses with Wi-Fi 7 access points and heavy PoE loads.'],
    rec: ['C9300X-24HX', '24 port 10G çok hızlı (mGig) ve UPOE+ (90 W), 735 W PoE; Wi-Fi 7 erişim noktaları için güçlü bir seçim.', '24 multigigabit (mGig) 10G ports with UPOE+ (90 W) and 735 W of PoE; a strong pick for Wi-Fi 7 access points.'],
  },
  '9200L-M': {
    src: DS.m9200L, lic: LIC.cat9kM, variant: VAR.m, l3: 'basic_l3',
    kind: ['Meraki panosuyla yönetilen Catalyst 9200L (-M)', 'Catalyst 9200L managed from the Meraki dashboard (-M)'],
    intro: ['Catalyst 9200L-M: Catalyst 9200L donanımı, Meraki panosuyla (bulut) yönetilir. Kurulum sıfır dokunuşla uzaktan yapılır; her cihaz için Meraki lisansı gerekir.', 'Catalyst 9200L-M: Catalyst 9200L hardware managed from the Meraki dashboard (cloud). Setup is zero-touch and remote; each device needs a Meraki licence.'],
    aud: ['Meraki panosunu zaten kullanan veya bulut yönetimi isteyen şube ve küçük-orta işletmeler.', 'Branches and small-to-medium businesses that already use the Meraki dashboard or want cloud management.'],
    rec: ['C9200L-24P-4X-M', '24 port PoE+ (370 W) ve 10G yukarı bağlantı; Meraki panosuyla yönetilen en dengeli 9200L modeli.', '24 PoE+ ports (370 W) and a 10G uplink; the most balanced Meraki-managed 9200L model.'],
  },
  '9300-M': {
    src: DS.m9300, lic: LIC.cat9kM, variant: VAR.m, l3: 'basic_l3',
    kind: ['Meraki panosuyla yönetilen Catalyst 9300 (-M)', 'Catalyst 9300 managed from the Meraki dashboard (-M)'],
    intro: ['Catalyst 9300-M: Catalyst 9300 donanımı, Meraki panosuyla (bulut) yönetilir. Modüler yukarı bağlantı, 480G yığınlama ve UPOE seçenekleri vardır.', 'Catalyst 9300-M: Catalyst 9300 hardware managed from the Meraki dashboard (cloud). Modular uplinks, 480G stacking and UPOE options are available.'],
    aud: ['Bulut yönetimiyle büyük ofis veya kampüs kurmak isteyenler.', 'Those who want to run a large office or campus with cloud management.'],
    rec: ['C9300-24P-M', '24 port PoE+ (445 W) ve ağ modülüyle seçilebilir yukarı bağlantı; Meraki panosuyla yönetilir.', '24 PoE+ ports (445 W) and an uplink chosen with a network module; managed from the Meraki dashboard.'],
  },
  '9300L-M': {
    src: DS.m9300L, lic: LIC.cat9kM, variant: VAR.m, l3: 'basic_l3',
    kind: ['Meraki panosuyla yönetilen Catalyst 9300L (-M)', 'Catalyst 9300L managed from the Meraki dashboard (-M)'],
    intro: ['Catalyst 9300L-M: Catalyst 9300L donanımı, Meraki panosuyla (bulut) yönetilir. Sabit yukarı bağlantılıdır; yığınlama için yığın kiti gerekir.', 'Catalyst 9300L-M: Catalyst 9300L hardware managed from the Meraki dashboard (cloud). It has fixed uplinks; a stack kit is needed for stacking.'],
    aud: ['Bulut yönetimiyle orta ölçekli ofis ve şubeler.', 'Mid-size offices and branches with cloud management.'],
    rec: ['C9300L-24P-4X-M', '24 port PoE+ (505 W) ve 10G yukarı bağlantı; Meraki panosuyla yönetilir.', '24 PoE+ ports (505 W) and a 10G uplink; managed from the Meraki dashboard.'],
  },
  '9300X-M': {
    src: DS.m9300X, lic: LIC.cat9kM, variant: VAR.m, l3: 'basic_l3',
    kind: ['Meraki panosuyla yönetilen Catalyst 9300X (-M)', 'Catalyst 9300X managed from the Meraki dashboard (-M)'],
    intro: ['Catalyst 9300X-M: Catalyst 9300X donanımı, Meraki panosuyla (bulut) yönetilir. 100G yukarı bağlantı, 1 Tbps yığınlama ve UPOE+ (90 W) seçenekleri vardır.', 'Catalyst 9300X-M: Catalyst 9300X hardware managed from the Meraki dashboard (cloud). 100G uplinks, 1 Tbps stacking and UPOE+ (90 W) options are available.'],
    aud: ['Bulut yönetimiyle Wi-Fi 7 ve yoğun PoE yüklü büyük ofis ve kampüsler.', 'Large offices and campuses with Wi-Fi 7 and heavy PoE loads, managed from the cloud.'],
    rec: ['C9300X-24HX-M', '24 port 10G çok hızlı (mGig) ve UPOE+ (90 W), 735 W PoE; Meraki panosuyla yönetilir.', '24 multigigabit (mGig) 10G ports with UPOE+ (90 W) and 735 W of PoE; managed from the Meraki dashboard.'],
  },
  'MS130 COMPACT': {
    src: DS.ms130, lic: LIC.ms130,
    kind: ['Meraki MS130 kompakt bulut yönetimli anahtar', 'Meraki MS130 compact cloud-managed switch'],
    intro: ['MS130 kompakt: 8-12 portlu, masaüstü veya duvara monte, Meraki panosuyla yönetilen küçük anahtarlar.', 'MS130 compact: small 8-12 port desktop or wall-mount switches managed from the Meraki dashboard.'],
    aud: ['Küçük ofis, mağaza ve toplantı odaları; az sayıda PoE cihazı.', 'Small offices, shops and meeting rooms with few PoE devices.'],
    rec: ['MS130-8P-HW', '8 port PoE+ (120 W), masaüstü veya duvara monte; küçük şubeler için en basit Meraki anahtarı.', '8 PoE+ ports (120 W), desktop or wall mount; the simplest Meraki switch for a small branch.'],
  },
  MS130: {
    src: DS.ms130, lic: LIC.ms130,
    kind: ['Meraki MS130 bulut yönetimli anahtar', 'Meraki MS130 cloud-managed switch'],
    intro: ['MS130: Meraki panosuyla yönetilen, giriş seviyesi katman 2 erişim anahtarı. 24 ve 48 portlu, rafa takılır; çok hızlı (mGig) PoE+ ve 10G yukarı bağlantı seçenekleri vardır.', 'MS130: an entry-level layer 2 access switch managed from the Meraki dashboard. 24 and 48 ports, rack-mount, with multigigabit (mGig) PoE+ and 10G uplink options.'],
    aud: ['Şube ve ofislerde bulut yönetimiyle temel erişim anahtarı arayanlar.', 'Those who want a basic access switch with cloud management for branches and offices.'],
    rec: ['MS130-24P-HW', '24 port PoE+ (370 W); bulut yönetimli bir ofis için temel seçim.', '24 PoE+ ports (370 W); the basic choice for a cloud-managed office.'],
  },
  MS130R: {
    src: DS.ms130r, lic: LIC.ms130,
    kind: ['Meraki MS130R sağlam bulut yönetimli anahtar', 'Meraki MS130R rugged cloud-managed switch'],
    intro: ['MS130R: sağlam (IP30) yapılı, -40 ile 70 °C arasında çalışan, Meraki panosuyla yönetilen 8 portlu PoE anahtar.', 'MS130R: a rugged (IP30) 8-port PoE switch that works from -40 to 70 °C, managed from the Meraki dashboard.'],
    aud: ['Depo, saha ve açık kabin gibi sert ortamlar.', 'Harsh places such as warehouses, field sites and outdoor cabinets.'],
    rec: null,
  },
  MS150: {
    src: DS.ms150, lic: LIC.ms150, l3: 'basic_l3', stackNote: true,
    kind: ['Meraki MS150 bulut yönetimli anahtar', 'Meraki MS150 cloud-managed switch'],
    intro: ['MS150: Meraki panosuyla yönetilen, yığınlanabilir erişim anahtarı. 5G çok hızlı (mGig) ve 60 W PoE seçenekleri, 10G yukarı bağlantı ve statik yönlendirme vardır.', 'MS150: a stackable access switch managed from the Meraki dashboard. 5G multigigabit (mGig) and 60 W PoE options, 10G uplinks and static routing are available.'],
    aud: ['Bulut yönetimli şube ve ofis ağlarında yığınlama veya çok hızlı PoE gerekenler.', 'Cloud-managed branch and office networks that need stacking or multigigabit PoE.'],
    rec: ['MS150-24P-4X', '24 port PoE+ (370 W), 10G yukarı bağlantı ve 80G yığınlama; bulut yönetimli şubeler için dengeli seçim.', '24 PoE+ ports (370 W), a 10G uplink and 80G stacking; a balanced choice for cloud-managed branches.'],
  },
  MS210: {
    src: DS.ms210, lic: LIC.ms150, eos: {
      last_order: '2026-04-30', announced: '2025-10-30', ldos: '2031-04-30', bulletin: BULLETIN.ms210,
      repl: { 'MS210-24-HW': ['MS150-24T-4G'], 'MS210-24P-HW': ['MS150-24P-4G'], 'MS210-48FP-HW': ['MS150-48FP-4G'], 'MS210-48-HW': ['MS150-48T-4G'], 'MS210-48LP-HW': ['MS150-48LP-4G'] },
    },
    kind: ['Meraki MS210 bulut yönetimli anahtar (satışı sona erdi)', 'Meraki MS210 cloud-managed switch (end of sale)'],
    intro: ['MS210: satışı 30 Nisan 2026\'da sona erdi; yerine MS150 önerilir. Yeni projede kullanmayın, yalnızca eski kurulumları tanımak için listelenir.', 'MS210: end of sale was 30 April 2026; Meraki recommends the MS150. Do not use it in new projects; it is listed only to recognise installed devices.'],
    aud: ['Mevcut kurulumlar; yeni projede MS150 kullanın.', 'Existing installations; use the MS150 for new projects.'],
    rec: null,
  },
  MS450: {
    src: DS.ms450, lic: LIC.ms150, eos: {
      last_order: '2026-10-29', announced: '2026-04-30', ldos: '2031-10-31', bulletin: BULLETIN.ms450, note: ['Cisco\'nun önerdiği yedek: Catalyst 9500 serisi (henüz kataloğa eklenmedi).', 'The replacement Cisco names: the Catalyst 9500 series (not in the catalogue yet).'],
    },
    kind: ['Meraki MS450 bulut yönetimli toplama anahtarı (satışı sona eriyor)', 'Meraki MS450 cloud-managed aggregation switch (end of sale announced)'],
    intro: ['MS450: 12 x 40G toplama anahtarı. Satışı sona eriyor (son sipariş 29 Ekim 2026); yerine Catalyst 9500 serisi önerilir.', 'MS450: a 12 x 40G aggregation switch. End of sale is announced (last order 29 October 2026); the Catalyst 9500 series is the suggested replacement.'],
    aud: ['Mevcut kurulumlar; yeni projede Catalyst 9500 kullanın.', 'Existing installations; use the Catalyst 9500 for new projects.'],
    rec: null,
  },
  C9500: {
    src: DS.c9500, lic: LIC.cat9k, only: ['C9500-16X', 'C9500-16X-2Q', 'C9500-24Y4C'], eosPids: ['C9500-16X', 'C9500-16X-2Q'], eos: {
      last_order: '2026-04-30', announced: '2025-04-30', ldos: '2031-04-30', bulletin: BULLETIN.c9500,
      repl: { 'C9500-16X': ['C9500-24Y4C'], 'C9500-16X-2Q': ['C9500-24Y4C'] },
    },
    kind: ['Catalyst 9500 omurga anahtarı (satışı sona erdi)', 'Catalyst 9500 core switch (end of sale)'],
    cur: {
      kind: ['Catalyst 9500 omurga anahtarı', 'Catalyst 9500 core switch'],
      aud: ['Kampüs omurgası ve toplama katmanı; 25G erişim ve 100G yukarı bağlantı gerekenler.', 'Campus core and aggregation layers that need 25G access and 100G uplinks.'],
    },
    intro: ['Catalyst 9500: kampüs omurgası ve toplama anahtarı. Burada C9500-24Y4C ile satışı sona eren C9500-16X modelleri listelenir; diğer 9500 modelleri henüz eklenmedi.', 'Catalyst 9500: campus core and aggregation switch. Listed here are the C9500-24Y4C and the C9500-16X models, which are end of sale; the other 9500 models are not added yet.'],
    aud: ['Mevcut kurulumlar; yeni projede C9500-24Y4C kullanın.', 'Existing installations; use the C9500-24Y4C for new projects.'],
    rec: null,
  },
  CBS220: {
    src: DS.cbs220, lic: LIC.silent,
    kind: ['Cisco Business 220 akıllı anahtar', 'Cisco Business 220 smart switch'],
    intro: ['Cisco Business 220: küçük işletmeler için basit, katman 2 akıllı anahtarlar; Cisco Business Dashboard veya mobil uygulamayla yönetilir. 8-48 port, isteğe bağlı PoE+.', 'Cisco Business 220: simple layer 2 smart switches for small businesses, managed with the Cisco Business Dashboard or mobile app. 8-48 ports, optional PoE+.'],
    aud: ['Küçük işletmeler; basit kurulum, az yönetim yükü, temel VLAN ve PoE.', 'Small businesses that want simple setup, little management effort, basic VLANs and PoE.'],
    rec: ['CBS220-24FP-4G', '24 portun hepsine PoE+ verir (382 W); küçük bir ofis için yeterli ve kurulumu kolay.', 'Gives PoE+ on all 24 ports (382 W); enough for a small office and easy to set up.'],
  },
};

// ---- Text templates
const trNum = (n) => String(n).replace('.', ',');
const g = (n) => `${trNum(n)}G`;
const POE_TR = { poe: 'PoE (port başına en fazla 15,4 W)', poe_plus: 'PoE+ (port başına en fazla 30 W)', upoe: 'UPOE (port başına en fazla 60 W)', upoe_plus: 'UPOE+ (port başına en fazla 90 W)' };
const POE_EN = { poe: 'PoE (up to 15.4 W per port)', poe_plus: 'PoE+ (up to 30 W per port)', upoe: 'UPOE (up to 60 W per port)', upoe_plus: 'UPOE+ (up to 90 W per port)' };
const L3_TR = { l2: 'yok (katman 2 anahtar)', basic_l3: 'temel katman 3', full_l3: 'tam katman 3' };
const L3_EN = { l2: 'none (layer 2 switch)', basic_l3: 'basic layer 3', full_l3: 'full layer 3' };

function uplinkText(row, lang) {
  const list = row.uplink_gbps ?? [];
  const fmt = lang === 'tr' ? g : (n) => `${n}G`;
  if (row.modular_uplinks) {
    const lo = Math.min(...list), hi = Math.max(...list);
    return lang === 'tr' ? `modüler (ağ modülüne göre ${fmt(lo)}-${fmt(hi)})` : `modular (${fmt(lo)}-${fmt(hi)} depending on the network module)`;
  }
  const speeds = list.map(fmt).join(' / ');
  const n = row.uplink_count;
  return n ? (lang === 'tr' ? `${n} adet ${speeds}` : `${n} x ${speeds}`) : speeds;
}

function copy(row, s, poe) {
  const poeTr = row.poe ? `PoE: ${POE_TR[row.poe_type]}, toplam ${poe.w} W.` : 'PoE vermez.';
  const poeEn = row.poe ? `PoE: ${POE_EN[row.poe_type]}, ${poe.w} W in total.` : 'No PoE.';
  const mg = row.mgig ? { tr: ' Bazı portları çok hızlıdır (mGig).', en: ' Some ports are multigigabit (mGig).' } : { tr: '', en: '' };
  const stk = row.stacking ? { tr: ' Yığınlanabilir (stacking).', en: ' Stackable.' } : { tr: '', en: '' };
  const summary_tr = `${s.kind[0]}, ${row.port_count} portlu.${mg.tr} ${poeTr} Yukarı bağlantı: ${uplinkText(row, 'tr')}. Yönlendirme: ${L3_TR[row.layer3]}.${stk.tr}`;
  const summary_en = `${s.kind[1]}, ${row.port_count} ports.${mg.en} ${poeEn} Uplink: ${uplinkText(row, 'en')}. Routing: ${L3_EN[row.layer3]}.${stk.en}`;
  const poeGoodTr = row.poe ? ` Toplam ${poe.w} W PoE bütçesi var; IP telefon, kamera ve erişim noktası sayınıza yetip yetmediğine bakın.` : ' PoE gerektirmeyen cihazlar için.';
  const poeGoodEn = row.poe ? ` It has a ${poe.w} W PoE budget; check that it is enough for your IP phones, cameras and access points.` : ' For devices that do not need PoE.';
  return { summary_tr, summary_en, good_for_tr: s.aud[0] + poeGoodTr, good_for_en: s.aud[1] + poeGoodEn };
}

function poeNote(pid, poe) {
  if (POE_NOTES[pid]) return POE_NOTES[pid];
  if (!poe.psu) return [null, null];
  const second = poe.w2 ? ` İki güç kaynağıyla ${poe.w2} W'a kadar çıkar.` : '';
  const secondEn = poe.w2 ? ` With two power supplies it goes up to ${poe.w2} W.` : '';
  if (poe.psu === 315) return [`Toplam PoE gücü ${poe.w} W (315 W iç güç kaynağı); ikinci güç kaynağı yoktur.`, `Total PoE is ${poe.w} W (315 W internal power supply); there is no second supply.`];
  return [
    `Toplam PoE gücü güç kaynağına bağlıdır: varsayılan ${poe.psu} W güç kaynağıyla ${poe.w} W.${second} Siparişte güç kaynağını seçin.`,
    `Total PoE depends on the power supply: ${poe.w} W with the default ${poe.psu} W supply.${secondEn} Choose the supply when you order.`,
  ];
}

function syncFeature(row, feature, on) {
  const set = new Set(row.features ?? []);
  if (on) set.add(feature); else set.delete(feature);
  row.features = [...set].sort();
}

// ---- Run
const { sheets } = await readWorkbook(workbookPath('switching'), 'switching');
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
    if (s.only && !s.only.includes(row.pid)) continue;
    const isEos = Boolean(s.eos) && (!s.eosPids || s.eosPids.includes(row.pid));
    const sc = isEos || !s.cur ? s : { ...s, ...s.cur };
    if (NOT_READY[row.pid]) continue;
    const before = { poe: row.poe, poe_type: row.poe_type, stacking: row.stacking, layer3: row.layer3, downlink_gbps: row.downlink_gbps, uplink_gbps: row.uplink_gbps };

    // PoE: a PID in POE gives PoE; a legacy PoE row without a budget is a gap we refuse to paper over.
    const poe = POE[row.pid];
    if (row.poe === true && !poe && !isEos) throw new Error(`${row.pid}: legacy says PoE but no verified budget`);
    row.poe = Boolean(poe);
    if (poe) {
      row.poe_budget_w = poe.w;
      if (!row.poe_type && !PATCH[row.pid]?.poe_type) throw new Error(`${row.pid}: PoE without poe_type`);
    } else {
      row.poe_budget_w = null; row.poe_type = null; row.poe_coverage = null;
    }
    Object.assign(row, PATCH[row.pid] ?? {});
    if (s.l3) row.layer3 = s.l3;
    if (row.pid.startsWith('C1300')) row.stacking = C1300_STACK.has(row.pid);
    if (s.stackNote) row.stacking = true;
    syncFeature(row, 'poe', row.poe);
    syncFeature(row, 'stacking', row.stacking);

    for (const key of ['poe', 'poe_type', 'stacking', 'layer3', 'downlink_gbps', 'uplink_gbps']) note(row.pid, key, before[key], row[key]);

    const text = copy(row, sc, poe ?? { w: null });
    const [pnT, pnE] = poe ? poeNote(row.pid, poe) : [null, null];
    const variant = s.variant ?? (s.vea && /^C9200/.test(row.pid) ? s.vea : null);
    Object.assign(row, {
      ...text,
      licence_required: s.lic.required, licence_note_tr: s.lic.tr, licence_note_en: s.lic.en,
      poe_note_tr: pnT, poe_note_en: pnE,
      variant_note_tr: variant ? variant[0] : null, variant_note_en: variant ? variant[1] : null,
      datasheet_url: s.src, source_url: s.src,
      last_verified: VERIFIED, added_date: ADDED, needs_data: null, status: 'ready',
    });
    if (s.vea && s.variant && /^C9200/.test(row.pid)) {
      row.variant_note_tr = `${s.variant[0]} ${s.vea[0]}`;
      row.variant_note_en = `${s.variant[1]} ${s.vea[1]}`;
    }

    if (isEos) {
      const last = s.eos.last_order;
      row.lifecycle = last <= VERIFIED ? 'eos' : 'eos_announced';
      const repl = s.eos.repl?.[row.pid] ?? null;
      Object.assign(row, {
        eos_announced: s.eos.announced, last_order: last, ldos: s.eos.ldos, eol_bulletin_url: s.eos.bulletin,
        replacement_pid: repl, replacement_note: repl ? null : s.eos.note[0], replacement_note_en: repl ? null : s.eos.note[1], replacement_none: null,
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
for (const pid of Object.keys(POE)) {
  if (pid.endsWith('-M') && !byPid.get(pid)) delete POE[pid];
  else if (!byPid.get(pid)) throw new Error(`POE table lists unknown PID ${pid}`);
}

const seriesByName = new Map(sheets.series.map((r) => [r.series, r]));
for (const [name, s] of Object.entries(SERIES)) {
  const r = seriesByName.get(name);
  if (!r) throw new Error(`Unknown series ${name}`);
  Object.assign(r, { series_intro_tr: s.intro[0], series_intro_en: s.intro[1], status: 'ready' });
}

await writeWorkbook(workbookPath('switching'), 'switching', sheets);
const ready = sheets.models.filter((m) => m.status === 'ready').length;
console.log(`switching.xlsx: ${touched} rows filled, ${ready} ready, ${sheets.models.length - ready} draft`);
console.log(`\nCorrections to the legacy values (${corrections.length}):`);
for (const c of corrections) console.log(`  ${c}`);
