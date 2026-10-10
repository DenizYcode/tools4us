// Phase 3 data pass for wireless.xlsx: values verified against Cisco and Meraki datasheets, the Cisco
// Wireless Ordering Guide and the Wi-Fi 6 indoor End-of-Sale bulletin (EOL15855) on 2026-10-10.
// The evidence per model is in docs/Phase3_Wireless_Verification.md. Turkish text is a draft written
// from those specs and needs native review. Nothing here is invented: where a source was silent the
// field is left empty and the row stays draft (see NOT_READY).
//
// Run once: node scripts/build-data/fill/wireless-pass1.mjs   (idempotent: it sets the same values again)

import { readWorkbook, writeWorkbook } from '../xlsx-io.mjs';
import { workbookPath } from '../catalog.mjs';

const VERIFIED = '2026-10-10';
const ADDED = '2026-10-10';

const BULLETIN = 'https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9100ax-access-points/meraki-wi-fi-6-indoor-access-points-eol.html';

// Rows that stay draft, with the reason (copied into needs_data and docs/Phase3_Wireless_Needs.md).
const NOT_READY = {
  'CBW151AXM-E-EU': 'The datasheet does not state ports or uplink, and the exact PID -E-EU is not listed (only CBW151AXM-x). A mesh extender with AC power and no PoE does not fit the PoE fields; decide how to show it.',
};

const L = {
  sub: ['Lisans gerekir: Cisco Ağ Aboneliği (Cisco Wireless Essentials veya Advantage).', 'Licence required: Cisco Networking Subscription (Cisco Wireless Essentials or Advantage).'],
  dual: ['Lisans gerekir: Cisco Ağ Aboneliği (Wireless Essentials veya Advantage) ya da Cisco DNA lisansı (Essentials veya Advantage). Hangisinin zorunlu olduğunu Cisco iş ortağınızla doğrulayın.', 'Licence required: Cisco Networking Subscription (Wireless Essentials or Advantage) or a Cisco DNA licence (Essentials or Advantage). Confirm which one applies with your Cisco partner.'],
  meraki: ['Lisans gerekir: Meraki erişim noktası lisansı.', 'Licence required: Meraki access point licence.'],
  iw: ['Lisans gerekir: Wi-Fi modu için Cisco DNA Essentials veya Advantage, URWB modu için ayrı URWB lisansı. Hangi lisansın hangi modele denk geldiğini Cisco iş ortağınızla doğrulayın.', 'Licence required: Cisco DNA Essentials or Advantage for Wi-Fi mode, a separate URWB licence for URWB mode. Confirm which licence fits which model with your Cisco partner.'],
  cbw: ['Temel kullanım için lisans gerekmez. Cisco Umbrella gibi isteğe bağlı hizmetler ayrıdır.', 'No licence is needed for basic use. Optional services such as Cisco Umbrella are separate.'],
  c9124: ['Lisans bilgisi veri sayfasında verilmemiştir; Cisco DNA Software for Wireless belgesine bakın veya Cisco iş ortağınıza sorun.', 'The datasheet does not state the licence; see Cisco DNA Software for Wireless or ask your Cisco partner.'],
};

const V = {
  cfgRtg: [
    'Cisco sipariş akışında iki seçenek vardır: -RTG (Ready to Go) hızlı sevkiyat ve hazır varsayılan seçimler içindir; -CFG (Configurable) aksesuar ve paketlemeyi özelleştirmenize izin verir. Veri sayfası tek model olarak anlatır. Kaynak: Cisco Wireless Ordering Guide.',
    'Cisco has two options in its ordering flow: -RTG (Ready to Go) is the fastest shipment with default choices; -CFG (Configurable) lets you customise accessories and packaging. The datasheet describes a single model. Source: Cisco Wireless Ordering Guide.',
  ],
  mr: [
    'Sonu -MR olan PID bulut (Meraki panosu) yönetimli sürümdür; -MR olmayan PID şirket içi yönetim (Catalyst 9800 / Catalyst Center) içindir. Sipariş PID\'sine bölge kodu (-x) eklenir; ülkeniz için onayı ve doğru kodu Cisco sipariş kılavuzundan doğrulayın. Kaynak: veri sayfası ve Cisco Wireless Ordering Guide.',
    'A PID ending in -MR is the cloud-managed (Meraki dashboard) version; the PID without -MR is for on-premises management (Catalyst 9800 / Catalyst Center). The ordering PID gets a regulatory-domain code (-x); confirm approval and the right code for your country in the Cisco ordering guide. Source: datasheet and Cisco Wireless Ordering Guide.',
  ],
  domain: [
    'Sipariş PID\'sinin sonuna bölge kodu (-x) eklenir. Ülkeniz için onayı ve doğru kodu Cisco sipariş kılavuzundan doğrulayın.',
    'The ordering PID ends with a regulatory-domain code (-x). Confirm approval and the right code for your country in the Cisco ordering guide.',
  ],
  iwMode: [
    'PID\'deki -AP, -URWB ve -WGB eki cihazın yazılım modunu gösterir: -AP normal Wi-Fi erişim noktası, -URWB hareketli araçlar için kesintisiz kablosuz bağlantı, -WGB başka bir erişim noktasına bağlanıp kablolu cihazlara bağlantı verir. Sipariş PID\'sine bölge kodu (-x) eklenir; doğru kodu Cisco sipariş kılavuzundan doğrulayın.',
    'The -AP, -URWB and -WGB suffix is the software mode: -AP is a normal Wi-Fi access point, -URWB is uninterrupted wireless backhaul for moving vehicles, -WGB joins another access point and connects wired devices. The ordering PID gets a regulatory-domain code (-x); confirm the right code in the Cisco ordering guide.',
  ],
};

// Group = one model card. pids: every orderable PID of the card. set: fields applied to all of them.
// copy: [summary_tr, summary_en, good_for_tr, good_for_en]. poe: [poe_note_tr, poe_note_en].
const GROUPS = [
  // ---- Wi-Fi 7 (CW917x) ----
  {
    pids: ['CW9179F'], lic: L.sub,
    copy: ['Dört radyolu, güçlü bir Wi-Fi 7 (802.11be) erişim noktası. Yönlü antenleri vardır; ek "dış ortam paketi" ile dış mekânda da kullanılabilir.', 'A powerful four-radio Wi-Fi 7 (802.11be) access point with directional antennas. With the optional outdoor pack it can also be used outdoors.',
      'Depo, üretim tesisi gibi geniş ve yoğun alanlar; dış mekâna taşan kapalı alanlar.', 'Wide, busy areas such as warehouses and production sites, and indoor areas that reach outdoors.'],
    poe: ['802.3at (PoE+) ile radyolar 2x2\'ye düşer ve bağlantı 2,5G (dört radyo modu) ya da 1G (üç radyo modu) olur. 802.3af yalnızca kurulum hazırlığı içindir; radyolar kapalıdır.', 'On 802.3at (PoE+) the radios drop to 2x2 and the link is 2.5G (four-radio mode) or 1G (three-radio mode). 802.3af is for staging only; the radios are off.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['CW9178I-CFG', 'CW9178I-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['Her bantta 4x4 çalışan, dört radyoya geçebilen üst düzey iç mekân Wi-Fi 7 (802.11be) erişim noktası. İki adet 10G bağlantı portu vardır.', 'A top-end indoor Wi-Fi 7 (802.11be) access point with 4x4 on every band that can switch to four radios. It has two 10G ports.',
      'Çok kullanıcılı, yoğun iç mekânlar: büyük ofis, konferans salonu, okul.', 'Busy indoor spaces with many users: large offices, conference halls, schools.'],
    poe: ['802.3at (PoE+) ile radyolar çoğunlukla 2x2\'ye düşer, bağlantı 2,5G ya da 1G olur ve USB kapanır. 802.3af yalnızca kurulum hazırlığı içindir.', 'On 802.3at (PoE+) the radios mostly drop to 2x2, the link falls to 2.5G or 1G and USB is off. 802.3af is for staging only.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  ...['I', 'D', 'E'].map((k) => ({
    pids: [`CW9177${k}-CFG`, `CW9177${k}-RTG`], lic: L.sub, variant: V.cfgRtg,
    copy: k === 'I'
      ? ['Dış mekân için Wi-Fi 7 (802.11be) erişim noktası; her yöne yayın yapan dahili antenleri vardır. Toza ve suya karşı korumalıdır (IP67).', 'An outdoor Wi-Fi 7 (802.11be) access point with built-in all-round antennas. Protected against dust and water (IP67).', 'Otopark, avlu, depo sahası gibi açık alanlarda geniş kapsama.', 'Wide coverage in open areas such as car parks, courtyards and yards.']
      : k === 'D'
        ? ['Dış mekân için Wi-Fi 7 (802.11be) erişim noktası; dahili yönlü antenleri sinyali belirli bir alana odaklar. IP67 korumalıdır.', 'An outdoor Wi-Fi 7 (802.11be) access point whose built-in directional antennas focus the signal on one area. IP67 protected.', 'Bina cephesi veya direkten belirli bir alanı (meydan, yükleme rampası) kapsamak.', 'Covering one specific area (a square, a loading dock) from a wall or pole.']
        : ['Dış mekân için Wi-Fi 7 (802.11be) erişim noktası; harici anten bağlanır, antenler ayrıca alınır. IP67 korumalıdır.', 'An outdoor Wi-Fi 7 (802.11be) access point that takes external antennas, ordered separately. IP67 protected.', 'Anten tipini ve yönünü kendiniz seçmek istediğiniz özel dış mekân projeleri.', 'Special outdoor projects where you choose the antenna type and direction yourself.'],
    poe: ['802.3at (PoE+) ile üç bantlı çalışmada her radyo 2x2\'ye ve bağlantı 2,5G\'ye düşer; çift bantlı çalışmada 6 GHz kullanılamaz. 802.3af yalnızca kurulum hazırlığı içindir.', 'On 802.3at (PoE+) every radio drops to 2x2 and the link to 2.5G in tri-band mode; 6 GHz is unavailable in dual-band mode. 802.3af is for staging only.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  })),
  {
    pids: ['CW9176I-CFG', 'CW9176I-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['Her bantta 4x4 çalışan, 10G bağlantılı iç mekân Wi-Fi 7 (802.11be) erişim noktası. Her yöne yayın yapan dahili antenleri vardır.', 'An indoor Wi-Fi 7 (802.11be) access point with 4x4 on every band and a 10G link, with built-in all-round antennas.',
      'Çok kullanıcılı büyük ofis, toplantı odaları, kampüs; birçok cihazın aynı anda bağlandığı yerler.', 'Large offices, meeting rooms and campuses where many devices connect at once.'],
    poe: ['802.3at (PoE+) ile 2,4 GHz radyo 4x4\'ten 2x2\'ye düşer, bağlantı 10G\'den 2,5G\'ye iner ve USB kapanır. 802.3af yalnızca kurulum hazırlığı içindir; radyolar kapalıdır.', 'On 802.3at (PoE+) the 2.4 GHz radio drops from 4x4 to 2x2, the link falls from 10G to 2.5G and USB is off. 802.3af is for staging only; the radios are off.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['CW9176D1-CFG', 'CW9176D1-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['CW9176I ile aynı sınıfta Wi-Fi 7 (802.11be) erişim noktası; dahili yönlü antenleri sinyali belirli bir alana odaklar.', 'A Wi-Fi 7 (802.11be) access point in the same class as the CW9176I, with built-in directional antennas that focus the signal on one area.',
      'Yüksek tavanlı salon, spor salonu, amfi gibi sinyalin bir yöne verilmesi gereken iç mekânlar.', 'Indoor spaces such as high-ceiling halls, gyms and lecture halls where the signal must be aimed.'],
    poe: ['802.3at (PoE+) ile 2,4 GHz radyo 2x2\'ye düşer, bağlantı 10G\'den 2,5G\'ye iner ve USB kapanır. 802.3af yalnızca kurulum hazırlığı içindir.', 'On 802.3at (PoE+) the 2.4 GHz radio drops to 2x2, the link falls from 10G to 2.5G and USB is off. 802.3af is for staging only.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['CW9174I-CFG', 'CW9174I-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['5 ve 6 GHz\'te 4x4 çalışan orta-üst sınıf iç mekân Wi-Fi 7 (802.11be) erişim noktası; bağlantı 5G\'ye kadar çıkar.', 'A mid-to-high class indoor Wi-Fi 7 (802.11be) access point with 4x4 on 5 and 6 GHz and a link of up to 5G.',
      'Orta ve büyük ofisler, toplantı odaları; yoğunluğun orta düzeyde olduğu yerler.', 'Medium and large offices and meeting rooms with moderate user density.'],
    poe: ['802.3at (PoE+) ile bağlantı 2,5G\'ye iner ve USB kapanır. 802.3af ile yalnızca 2,4 GHz\'de tek radyo (1x1) çalışır; yeni kurulum için uygun değildir.', 'On 802.3at (PoE+) the link falls to 2.5G and USB is off. On 802.3af only one 1x1 radio on 2.4 GHz works; not suitable for a new installation.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['CW9174E-CFG', 'CW9174E-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['CW9174I ile aynı sınıfta Wi-Fi 7 (802.11be) erişim noktası; harici anten bağlanır. Yalnızca iç mekânda kullanılır.', 'A Wi-Fi 7 (802.11be) access point in the same class as the CW9174I that takes external antennas. Indoor use only.',
      'Depo, fabrika gibi zorlu iç mekânlarda özel anten gereken kurulumlar.', 'Installations in tough indoor places, such as warehouses and factories, that need special antennas.'],
    poe: ['802.3at (PoE+) ile bağlantı 2,5G\'ye iner ve USB kapanır. 802.3af ile yalnızca 2,4 GHz\'de tek radyo (1x1) çalışır.', 'On 802.3at (PoE+) the link falls to 2.5G and USB is off. On 802.3af only one 1x1 radio on 2.4 GHz works.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['CW9172I-CFG', 'CW9172I-RTG'], lic: L.sub, variant: V.cfgRtg, recommend: ['CW9172I-RTG', 'Çoğu ofis için yeterli: Wi-Fi 7, 2,5G bağlantı ve standart PoE+ ile tam çalışır.', 'Enough for most offices: Wi-Fi 7, a 2.5G link, and full function on standard PoE+.'],
    copy: ['Küçük ve orta ofisler için giriş seviyesi Wi-Fi 7 (802.11be) erişim noktası. Üç bantta da 2x2 çalışır, bağlantı 2,5G\'dir.', 'An entry-level Wi-Fi 7 (802.11be) access point for small and medium offices. 2x2 on all three bands with a 2.5G link.',
      'Küçük ve orta ofisler, mağazalar, toplantı odaları; standart PoE+ (802.3at) veren anahtarı olanlar.', 'Small and medium offices, shops and meeting rooms with a switch that gives standard PoE+ (802.3at).'],
    poe: ['802.3af (PoE) ile yalnızca 2,4 GHz\'de tek radyo (1x1) çalışır; yeni kurulum için PoE+ (802.3at) kullanın.', 'On 802.3af (PoE) only one 1x1 radio on 2.4 GHz works; use PoE+ (802.3at) for a new installation.'],
    set: { poe_supported: ['af', 'at'], poe_full: 'at' },
  },
  {
    pids: ['CW9172H-CFG', 'CW9172H-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['Duvardaki ağ prizinin yerine takılan Wi-Fi 7 (802.11be) erişim noktası. Üzerinde üç adet LAN portu vardır; otel odası ve yurt gibi alanlar için tasarlanmıştır.', 'A Wi-Fi 7 (802.11be) access point that replaces the wall network socket. It has three LAN ports and is designed for hotel rooms, dormitories and similar spaces.',
      'Otel, yurt, hastane odası: her odada bir erişim noktası ve kablolu cihazlar için portlar.', 'Hotels, dormitories and hospital rooms: one access point per room plus ports for wired devices.'],
    poe: ['Üzerindeki LAN portundan PoE çıkışı vermek için 802.3bt gerekir. 802.3af (PoE) ile yalnızca 2,4 GHz\'de tek radyo (1x1) çalışır.', 'Giving PoE out of its LAN port needs 802.3bt. On 802.3af (PoE) only one 1x1 radio on 2.4 GHz works.'],
    set: { poe_supported: ['af', 'at', 'bt'], poe_full: 'at' },
  },
  {
    pids: ['CW9171I-CFG', 'CW9171I-RTG'], lic: L.sub, variant: V.cfgRtg,
    copy: ['En sade Wi-Fi 7 (802.11be) erişim noktası: iki radyo, 2x2, 2,5G bağlantı.', 'The simplest Wi-Fi 7 (802.11be) access point: two radios, 2x2, a 2.5G link.',
      'Küçük ofis ve mağazalar; yoğunluğun düşük olduğu yerler.', 'Small offices and shops with low user density.'],
    poe: ['802.3af (PoE) ile 2,4 GHz radyo tek akışa (1x1) düşer, 5/6 GHz radyosu çalışmaz, bağlantı 1G olur.', 'On 802.3af (PoE) the 2.4 GHz radio drops to 1x1, the 5/6 GHz radio does not work and the link is 1G.'],
    set: { poe_supported: ['af', 'at'], poe_full: 'at' },
  },
  // ---- Wi-Fi 6E (CW916x) ----
  ...[
    ['CW9166I', 'Her bantta 4x4 çalışan, 5G bağlantılı Wi-Fi 6E erişim noktası; her yöne yayın yapan dahili antenleri vardır.', 'A Wi-Fi 6E access point with 4x4 on every band and a 5G link, with built-in all-round antennas.', 'Orta ve büyük ofisler; 6 GHz bandını kullanmak isteyen ama Wi-Fi 7 gerekmeyen projeler.', 'Medium and large offices that want the 6 GHz band without needing Wi-Fi 7.'],
    ['CW9166D1', 'CW9166I ile aynı sınıfta Wi-Fi 6E erişim noktası; dahili yönlü antenleri sinyali belirli bir alana odaklar.', 'A Wi-Fi 6E access point in the same class as the CW9166I, with built-in directional antennas that focus the signal on one area.', 'Yüksek tavanlı salonlar ve sinyalin bir yöne verilmesi gereken iç mekânlar.', 'High-ceiling halls and indoor spaces where the signal must be aimed.'],
  ].map(([pid, st, se, gt, ge]) => ({
    pids: [pid, `${pid}-MR`], lic: L.dual, variant: V.mr, mgmt: { [pid]: ['on_prem'], [`${pid}-MR`]: ['cloud'] },
    copy: [st, se, gt, ge],
    poe: ['802.3at (PoE+) ile USB portu kapanır. 802.3af yalnızca kurulum hazırlığı içindir; radyolar kapalıdır.', 'On 802.3at (PoE+) the USB port is off. 802.3af is for staging only; the radios are off.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  })),
  {
    pids: ['CW9164I', 'CW9164I-MR'], lic: L.dual, variant: V.mr, mgmt: { CW9164I: ['on_prem'], 'CW9164I-MR': ['cloud'] },
    copy: ['5 ve 6 GHz\'te 4x4, 2,4 GHz\'te 2x2 çalışan Wi-Fi 6E erişim noktası. Dahili antenleri vardır, bağlantı 2,5G\'dir.', 'A Wi-Fi 6E access point with 4x4 on 5 and 6 GHz and 2x2 on 2.4 GHz. Built-in antennas, a 2.5G link.',
      'Orta büyüklükte ofisler; Wi-Fi 6E ve 6 GHz isteyen projeler.', 'Medium-sized offices and projects that want Wi-Fi 6E and 6 GHz.'],
    poe: ['802.3at (PoE+) ile USB portu kapanır. 802.3af ile bağlantı 1G\'ye iner; yalnızca kurulum hazırlığı içindir, radyolar kapalıdır.', 'On 802.3at (PoE+) the USB port is off. On 802.3af the link falls to 1G; it is for staging only and the radios are off.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['CW9162I', 'CW9162I-MR'], lic: L.dual, variant: V.mr, mgmt: { CW9162I: ['on_prem'], 'CW9162I-MR': ['cloud'] },
    recommend: ['CW9162I', 'Standart PoE+ ile tam çalışır; küçük ve orta ofisler için en kolay Wi-Fi 6E seçeneği.', 'Runs fully on standard PoE+; the easiest Wi-Fi 6E choice for small and medium offices.'],
    copy: ['Üç bantta da 2x2 çalışan giriş seviyesi Wi-Fi 6E erişim noktası; bağlantı 2,5G\'dir.', 'An entry-level Wi-Fi 6E access point with 2x2 on all three bands and a 2.5G link.',
      'Küçük ve orta ofisler, mağazalar; standart PoE+ (802.3at) veren anahtarı olanlar.', 'Small and medium offices and shops with a switch that gives standard PoE+ (802.3at).'],
    poe: ['802.3af (PoE) ile 2,4 GHz radyo kapanır, 5 ve 6 GHz tek akışa (1x1) düşer, bağlantı 1G olur ve USB kapanır.', 'On 802.3af (PoE) the 2.4 GHz radio is off, 5 and 6 GHz drop to 1x1, the link is 1G and USB is off.'],
    set: { poe_supported: ['af', 'at'], poe_full: 'at' },
  },
  {
    pids: ['CW9163E', 'CW9163E-MR'], lic: L.dual, variant: V.mr, mgmt: { CW9163E: ['on_prem'], 'CW9163E-MR': ['cloud'] },
    copy: ['Dış mekân için Wi-Fi 6E erişim noktası; harici anten bağlanır, antenler ayrıca alınır. IP67 korumalıdır.', 'An outdoor Wi-Fi 6E access point that takes external antennas, ordered separately. IP67 protected.',
      'Otopark, avlu, açık depo sahası; anten tipini kendiniz seçmek isteyen dış mekân projeleri.', 'Car parks, courtyards and open yards where you want to choose the antenna type.'],
    poe: ['802.3af (PoE) ile radyolar tek akışa (1x1) düşer ve bağlantı 1G olur.', 'On 802.3af (PoE) the radios drop to 1x1 and the link is 1G.'],
    set: { poe_supported: ['af', 'at'], poe_full: 'at' },
  },
  // ---- Catalyst 9136 / 9124 ----
  {
    pids: ['C9136I'], lic: L.dual, variant: V.domain, recommend: ['C9136I', 'Seride tek model: 5 GHz\'te 8x8 ve iki adet 5G port ile en yüksek kapasiteli Wi-Fi 6E seçeneği.', 'The only model in the series: the highest-capacity Wi-Fi 6E option with 8x8 on 5 GHz and two 5G ports.'],
    copy: ['5 GHz\'te 8x8, diğer bantlarda 4x4 çalışan yüksek kapasiteli Wi-Fi 6E erişim noktası. İki adet 5G bağlantı portu vardır.', 'A high-capacity Wi-Fi 6E access point with 8x8 on 5 GHz and 4x4 on the other bands. Two 5G ports.',
      'Çok yoğun iç mekânlar: büyük toplantı salonları ve kampüsler.', 'Very busy indoor spaces: large meeting halls and campuses.'],
    poe: ['802.3at (PoE+) ile radyolar küçülür ve tek bağlantı 2,5G\'de çalışır; USB kapanır. 802.3af yalnızca kurulum hazırlığı içindir.', 'On 802.3at (PoE+) the radios shrink and one link runs at 2.5G; USB is off. 802.3af is for staging only.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  ...['I', 'D', 'E'].map((k) => ({
    pids: [`C9124AX${k}`], lic: L.c9124, variant: V.domain,
    ...(k === 'I' ? { recommend: ['C9124AXI', 'Seride her yöne yayın yapan dahili antenli model; en yaygın dış mekân kurulumuna uyar.', 'The model with built-in all-round antennas; fits the most common outdoor installation.'] } : {}),
    copy: k === 'I'
      ? ['Dış mekân için Wi-Fi 6 erişim noktası; her yöne yayın yapan dahili antenleri vardır. IP66/IP67 korumalıdır.', 'An outdoor Wi-Fi 6 access point with built-in all-round antennas. IP66/IP67 protected.', 'Otopark, avlu, okul bahçesi gibi açık alanlar.', 'Open areas such as car parks, courtyards and school grounds.']
      : k === 'D'
        ? ['Dış mekân için Wi-Fi 6 erişim noktası; dahili yönlü antenleri sinyali belirli bir alana odaklar. IP66/IP67 korumalıdır.', 'An outdoor Wi-Fi 6 access point whose built-in directional antennas focus the signal on one area. IP66/IP67 protected.', 'Bina cephesi veya direkten belirli bir alanı kapsamak.', 'Covering one specific area from a wall or pole.']
        : ['Dış mekân için Wi-Fi 6 erişim noktası; harici anten bağlanır, antenler ayrıca alınır. IP66/IP67 korumalıdır.', 'An outdoor Wi-Fi 6 access point that takes external antennas, ordered separately. IP66/IP67 protected.', 'Anten tipini ve yönünü kendiniz seçmek istediğiniz özel dış mekân projeleri.', 'Special outdoor projects where you choose the antenna type and direction.'],
    poe: ['802.3at (PoE+) ile radyolar 2x2\'ye düşer, bağlantı 1G ile sınırlanır ve PoE çıkışı kapanır. 802.3af ile radyolar kapalıdır.', 'On 802.3at (PoE+) the radios drop to 2x2, the link is limited to 1G and PoE output is off. On 802.3af the radios are off.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  })),
  // ---- End-of-Sale Wi-Fi 6 indoor (bulletin EOL15855) ----
  ...[
    ['C9130AXI', 'Satış sonu duyurulmuş Wi-Fi 6 erişim noktası: 5 GHz\'te 8x8, dahili antenli.', 'An End-of-Sale Wi-Fi 6 access point: 8x8 on 5 GHz, built-in antennas.', ['at', 'bt'], 'bt', ['802.3at (PoE+) ile 5 GHz 8x8\'den 4x4\'e düşer. 802.3af ile radyolar tek akışa (1x1) düşer ve USB kapanır.', 'On 802.3at (PoE+) 5 GHz drops from 8x8 to 4x4. On 802.3af the radios drop to 1x1 and USB is off.'], ['CW9178I-CFG', 'CW9178I-RTG'], '2026-12-31'],
    ['C9130AXE', 'Satış sonu duyurulmuş Wi-Fi 6 erişim noktası: harici antenli, 5 GHz\'te 8x8.', 'An End-of-Sale Wi-Fi 6 access point: external antennas, 8x8 on 5 GHz.', ['at', 'bt'], 'bt', ['802.3at (PoE+) ile 5 GHz 8x8\'den 4x4\'e düşer. 802.3af ile radyolar tek akışa (1x1) düşer ve USB kapanır.', 'On 802.3at (PoE+) 5 GHz drops from 8x8 to 4x4. On 802.3af the radios drop to 1x1 and USB is off.'], ['CW9174E-CFG', 'CW9174E-RTG'], '2026-12-31'],
    ['C9120AXI', 'Satış sonu gelmiş Wi-Fi 6 erişim noktası: dahili antenli, 4x4.', 'An End-of-Sale Wi-Fi 6 access point: built-in antennas, 4x4.', ['af', 'at'], 'at', ['802.3af ile radyolar küçülür, bağlantı 1G olur ve USB kapanır.', 'On 802.3af the radios shrink, the link is 1G and USB is off.'], ['CW9176I-CFG', 'CW9176I-RTG'], '2026-07-31'],
    ['C9120AXE', 'Satış sonu gelmiş Wi-Fi 6 erişim noktası: harici antenli, 4x4.', 'An End-of-Sale Wi-Fi 6 access point: external antennas, 4x4.', ['af', 'at'], 'at', ['802.3af ile radyolar küçülür, bağlantı 1G olur ve USB kapanır.', 'On 802.3af the radios shrink, the link is 1G and USB is off.'], ['CW9174E-CFG', 'CW9174E-RTG'], '2026-07-10'],
    ['C9120AXP', 'Satış sonu gelmiş Wi-Fi 6 erişim noktası: profesyonel kurulumlar için harici antenli.', 'An End-of-Sale Wi-Fi 6 access point: external antennas for professional installations.', ['af', 'at'], 'at', ['802.3af ile radyolar küçülür, bağlantı 1G olur ve USB kapanır.', 'On 802.3af the radios shrink, the link is 1G and USB is off.'], ['CW9174E-CFG', 'CW9174E-RTG'], '2026-07-10'],
    ['C9115AXI', 'Satış sonu duyurulmuş Wi-Fi 6 erişim noktası: dahili antenli, 4x4.', 'An End-of-Sale Wi-Fi 6 access point: built-in antennas, 4x4.', ['af', 'at'], 'at', ['802.3af ile radyolar 2x2\'ye düşer, bağlantı 1G olur ve USB kapanır.', 'On 802.3af the radios drop to 2x2, the link is 1G and USB is off.'], ['CW9174I-CFG', 'CW9174I-RTG'], '2026-12-31'],
    ['C9115AXE', 'Satış sonu duyurulmuş Wi-Fi 6 erişim noktası: harici antenli, 4x4.', 'An End-of-Sale Wi-Fi 6 access point: external antennas, 4x4.', ['af', 'at'], 'at', ['802.3af ile radyolar 2x2\'ye düşer, bağlantı 1G olur ve USB kapanır.', 'On 802.3af the radios drop to 2x2, the link is 1G and USB is off.'], ['CW9174E-CFG', 'CW9174E-RTG'], '2026-12-31'],
    ['C9105AXI', 'Satış sonu duyurulmuş giriş seviyesi Wi-Fi 6 erişim noktası: 2x2, dahili antenli.', 'An End-of-Sale entry-level Wi-Fi 6 access point: 2x2, built-in antennas.', ['af', 'at'], 'af', null, ['CW9171I-CFG', 'CW9171I-RTG', 'CW9172I-CFG', 'CW9172I-RTG'], '2026-12-31'],
    ['C9105AXW', 'Satış sonu duyurulmuş Wi-Fi 6 erişim noktası: duvardaki ağ prizinin yerine takılır.', 'An End-of-Sale Wi-Fi 6 access point that replaces the wall network socket.', ['af', 'at'], 'at', ['802.3af ile USB ve LAN1\'den PoE çıkışı kapanır.', 'On 802.3af, USB and PoE output on LAN1 are off.'], ['CW9172H-CFG', 'CW9172H-RTG'], '2026-12-31'],
  ].map(([pid, st, se, sup, full, poe, repl, last]) => ({
    pids: [pid], eos: { last_order: last, repl },
    copy: [st, se, 'Mevcut kurulumun yedeği veya genişletmesi, son sipariş tarihine kadar. Yeni proje için yerine geçen modele bakın.', 'A spare or extension for an existing installation until the last order date. For a new project look at the replacement.'],
    poe, set: { poe_supported: sup, poe_full: full }, variant: V.domain,
    ...(pid === 'C9105AXW' ? { patch: { uplink_max_gbps: 2.5, uplink_mgig: true } } : {}),
  })),
  // ---- Meraki (MR) ----
  {
    pids: ['MR57'], lic: L.meraki, recommend: ['MR57', 'Meraki ailesinin en yeni iç mekân modeli: Wi-Fi 6E, 6 GHz ve 5G bağlantı.', 'The newest indoor Meraki model: Wi-Fi 6E, 6 GHz and a 5G link.'],
    copy: ['Bulutta yönetilen, üç bantlı (6 GHz dahil) Wi-Fi 6E erişim noktası; iki adet 5G portu vardır.', 'A cloud-managed, tri-band (including 6 GHz) Wi-Fi 6E access point with two 5G ports.',
      'Meraki panosuyla yönetilmek istenen orta ve büyük ofisler.', 'Medium and large offices that want to be managed from the Meraki dashboard.'],
    poe: ['802.3at (PoE+) ile USB portu kapanır; başka bir kısıt veri sayfasında belirtilmemiştir.', 'On 802.3at (PoE+) the USB port is off; the datasheet states no other limit.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['MR28'], lic: L.meraki,
    copy: ['Bulutta yönetilen giriş seviyesi Wi-Fi 6 erişim noktası; 2x2, 1G port, 802.3af PoE ile çalışır.', 'A cloud-managed entry-level Wi-Fi 6 access point; 2x2, a 1G port, runs on 802.3af PoE.',
      'Küçük ofis ve mağazalar; Meraki panosuyla yönetilmek istenen ve eski anahtarı olan yerler.', 'Small offices and shops that want Meraki management and may have an older switch.'],
    set: { poe_supported: ['af'], poe_full: 'af' },
  },
  ...[
    ['MR36', 'Bulutta yönetilen Wi-Fi 6 erişim noktası: 2x2, 1G port.', 'A cloud-managed Wi-Fi 6 access point: 2x2, a 1G port.', ['af'], 'af', null, ['CW9172I-CFG', 'CW9172I-RTG']],
    ['MR36H', 'Bulutta yönetilen Wi-Fi 6 erişim noktası; duvardaki ağ prizinin yerine takılır.', 'A cloud-managed Wi-Fi 6 access point that replaces the wall network socket.', ['af', 'at'], 'at', ['802.3af düşük güç modunda PoE çıkışı kapanır.', 'In the 802.3af low-power mode PoE output is off.'], ['CW9172H-CFG', 'CW9172H-RTG']],
    ['MR44', 'Bulutta yönetilen Wi-Fi 6 erişim noktası: 5 GHz\'te 4x4, 2,5G port.', 'A cloud-managed Wi-Fi 6 access point: 4x4 on 5 GHz, a 2.5G port.', ['af', 'at'], 'at', ['802.3af düşük güç modunda IoT ve tarama radyoları kapanır, bağlantı 1G olur ve 5 GHz 2x2\'ye düşer.', 'In the 802.3af low-power mode the IoT and scanning radios are off, the link is 1G and 5 GHz drops to 2x2.'], ['CW9174I-CFG', 'CW9174I-RTG']],
    ['MR46', 'Bulutta yönetilen Wi-Fi 6 erişim noktası: her iki bantta 4x4, 2,5G port.', 'A cloud-managed Wi-Fi 6 access point: 4x4 on both bands, a 2.5G port.', ['at'], 'at', null, ['CW9176I-CFG', 'CW9176I-RTG']],
    ['MR46E', 'Bulutta yönetilen Wi-Fi 6 erişim noktası: harici antenli, 4x4.', 'A cloud-managed Wi-Fi 6 access point: external antennas, 4x4.', ['at'], 'at', null, ['CW9174E-CFG', 'CW9174E-RTG']],
  ].map(([pid, st, se, sup, full, poe, repl]) => ({
    pids: [pid], lic: L.meraki, eos: { last_order: '2026-12-31', repl },
    copy: [st, se, 'Mevcut Meraki kurulumunun yedeği veya genişletmesi, son sipariş tarihine kadar. Yeni proje için yerine geçen modele bakın.', 'A spare or extension for an existing Meraki installation until the last order date. For a new project look at the replacement.'],
    poe, set: { poe_supported: sup, poe_full: full },
  })),
  {
    pids: ['MR76'], lic: L.meraki,
    copy: ['Bulutta yönetilen dış mekân Wi-Fi 6 erişim noktası; harici anten bağlanır. IP67 korumalıdır, 802.3af PoE ile çalışır.', 'A cloud-managed outdoor Wi-Fi 6 access point that takes external antennas. IP67 protected, runs on 802.3af PoE.',
      'Anten tipini kendiniz seçmek istediğiniz dış mekân Meraki projeleri.', 'Outdoor Meraki projects where you want to choose the antenna.'],
    set: { poe_supported: ['af'], poe_full: 'af' },
  },
  {
    pids: ['MR78'], lic: L.meraki, recommend: ['MR78', 'Dahili antenli, kurulumu en kolay dış mekân Meraki modeli; 802.3af PoE yeterlidir.', 'The easiest outdoor Meraki model to install, with built-in antennas; 802.3af PoE is enough.'],
    copy: ['Bulutta yönetilen dış mekân Wi-Fi 6 erişim noktası; dahili antenlidir. IP67 korumalıdır, 802.3af PoE ile çalışır.', 'A cloud-managed outdoor Wi-Fi 6 access point with built-in antennas. IP67 protected, runs on 802.3af PoE.',
      'Otopark, avlu, okul bahçesi; antenle uğraşmak istemeyen dış mekân projeleri.', 'Car parks, courtyards and school grounds; outdoor projects without antenna work.'],
    set: { poe_supported: ['af'], poe_full: 'af' },
  },
  {
    pids: ['MR86'], lic: L.meraki,
    copy: ['Bulutta yönetilen dış mekân Wi-Fi 6 erişim noktası: 4x4, 2,5G port, harici anten. IP67 korumalıdır; 802.3at PoE gerekir.', 'A cloud-managed outdoor Wi-Fi 6 access point: 4x4, a 2.5G port, external antennas. IP67 protected; needs 802.3at PoE.',
      'Yoğun dış mekân alanları (açık depo sahası, tesis içi yollar) ve özel anten gereken projeler.', 'Busy outdoor areas (open yards, site roads) and projects that need special antennas.'],
    set: { poe_supported: ['at'], poe_full: 'at' },
  },
  // ---- Industrial ----
  ...[
    ['IW9167EH-E-AP', 'IW9167EH-E-URWB', 'IW9167EH-E-WGB'],
  ].map((pids) => ({
    pids, lic: L.iw, variant: V.iwMode, recommend: ['IW9167EH-E-AP', 'Seride Wi-Fi modunda çalışan, harici antenli ana model; sahada en esnek seçenek.', 'The main Wi-Fi-mode model in the series with external antennas; the most flexible choice on a site.'],
    copy: ['Zorlu sanayi ortamları için Wi-Fi 6E erişim noktası; harici anten bağlanır. IP66/IP67 korumalıdır. Wi-Fi, URWB veya WGB modunda sipariş edilir.', 'A Wi-Fi 6E access point for harsh industrial places that takes external antennas. IP66/IP67 protected. Ordered for Wi-Fi, URWB or WGB mode.',
      'Fabrika, açık depo sahası gibi toz, su ve sıcaklığın zorladığı yerler.', 'Factories and open yards where dust, water and temperature are tough.'],
    poe: ['802.3at (PoE+) ile radyolar 2x2\'ye ve bağlantı 1G\'ye düşer; tam kapasite için 802.3bt (UPOE+) veya 24-48 V DC gerekir.', 'On 802.3at (PoE+) the radios drop to 2x2 and the link to 1G; full capacity needs 802.3bt (UPOE+) or 24-48 V DC.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  })),
  {
    pids: ['IW9167IH-E-AP'], lic: L.iw, variant: V.iwMode,
    copy: ['Zorlu sanayi ortamları için Wi-Fi 6E erişim noktası; dahili antenlidir. IP66/IP67 korumalıdır, yalnızca Wi-Fi modunda satılır.', 'A Wi-Fi 6E access point for harsh industrial places with built-in antennas. IP66/IP67 protected, sold in Wi-Fi mode only.',
      'Antenle uğraşmak istemeyen fabrika, depo ve saha kurulumları.', 'Factory, warehouse and site installations without antenna work.'],
    poe: ['802.3at (PoE+) ile radyolar 2x2\'ye ve bağlantı 1G\'ye düşer; tam kapasite için 802.3bt (UPOE+) veya 24-48 V DC gerekir.', 'On 802.3at (PoE+) the radios drop to 2x2 and the link to 1G; full capacity needs 802.3bt (UPOE+) or 24-48 V DC.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['IW9167EH-E-HZ'], lic: L.iw, variant: V.iwMode,
    copy: ['Patlayıcı ortamlar (tehlikeli bölge) için onaylı Wi-Fi 6E erişim noktası; harici antenlidir. IP66/IP67 korumalıdır.', 'A Wi-Fi 6E access point approved for explosive (hazardous) areas, with external antennas. IP66/IP67 protected.',
      'Patlayıcı gaz veya toz olabilen tehlikeli bölgeler (örneğin kimya ve enerji tesisleri).', 'Hazardous areas where explosive gas or dust may be present (for example chemical and energy plants).'],
    poe: ['802.3at (PoE+) ile radyolar 2x2\'ye ve bağlantı 1G\'ye düşer; tam kapasite için 802.3bt (UPOE+) veya 24-48 V DC gerekir.', 'On 802.3at (PoE+) the radios drop to 2x2 and the link to 1G; full capacity needs 802.3bt (UPOE+) or 24-48 V DC.'],
    set: { poe_supported: ['at', 'bt'], poe_full: 'bt' },
  },
  {
    pids: ['IW9165E-E-AP', 'IW9165E-E-WGB', 'IW9165E-E-URWB'], lic: L.iw, variant: V.iwMode, recommend: ['IW9165E-E-AP', 'Seride Wi-Fi modunda çalışan küçük, DIN rayına takılan model; araçlar ve makineler için uygundur.', 'The small DIN-rail model that works in Wi-Fi mode; fits vehicles and machines.'],
    copy: ['Araçlar, makineler ve raylı sistemler için küçük, sağlam Wi-Fi 6E erişim noktası; harici antenlidir. Wi-Fi, URWB veya WGB modunda sipariş edilir.', 'A small, rugged Wi-Fi 6E access point for vehicles, machines and rail systems, with external antennas. Ordered for Wi-Fi, URWB or WGB mode.',
      'Araçlar, makineler ve raylı sistemler gibi hareketli veya dar alanlı kurulumlar.', 'Moving or tight-space installations such as vehicles, machines and rail systems.'],
    poe: ['802.3af (PoE) ile iki radyo da tek akışa (1x1) düşer ve bağlantı 1G olur; 802.3at (PoE+) tam işlev için yeterlidir.', 'On 802.3af (PoE) both radios drop to 1x1 and the link is 1G; 802.3at (PoE+) is enough for full function.'],
    set: { poe_supported: ['af', 'at'], poe_full: 'at' },
  },
  {
    pids: ['IW9165DH-E-AP', 'IW9165DH-E-URWB'], lic: L.iw, variant: V.iwMode,
    copy: ['Zorlu ortamlar için Wi-Fi 6E erişim noktası; yönlü dahili antenlidir. IP66/IP67 korumalıdır, Wi-Fi veya URWB modunda sipariş edilir.', 'A Wi-Fi 6E access point for harsh places with built-in directional antennas. IP66/IP67 protected, ordered for Wi-Fi or URWB mode.',
      'İki nokta arası kablosuz bağlantı, araç veya hat boyunca kesintisiz kapsama.', 'Point-to-point wireless links and uninterrupted coverage along a vehicle path or track.'],
    poe: ['802.3af (PoE) ile iki radyo da tek akışa (1x1) düşer ve bağlantı 1G olur; 802.3at (PoE+) tam işlev için yeterlidir.', 'On 802.3af (PoE) both radios drop to 1x1 and the link is 1G; 802.3at (PoE+) is enough for full function.'],
    set: { poe_supported: ['af', 'at', 'bt'], poe_full: 'at' }, patch: { uplink_max_gbps: 2.5, uplink_mgig: true, port_count: 2 },
  },
  // ---- Cisco Business ----
  {
    pids: ['CBW150AX-E-EU'], lic: L.cbw, recommend: ['CBW150AX-E-EU', 'Serideki tek bağımsız erişim noktası: lisanssız, kutusunda PoE adaptörü var, telefon uygulamasıyla kurulur.', 'The only standalone access point in the series: no licence, a PoE injector in the box, set up from a phone app.'],
    copy: ['Küçük işletmeler için sade Wi-Fi 6 erişim noktası. Kontrolcü ve lisans gerekmez; telefon uygulaması veya web arayüzüyle yönetilir. Kutusunda PoE adaptörü vardır.', 'A simple Wi-Fi 6 access point for small businesses. No controller or licence needed; managed from a phone app or web page. A PoE injector is in the box.',
      'BT ekibi olmayan küçük ofis, mağaza, kafe.', 'Small offices, shops and cafés without an IT team.'],
    set: { poe_supported: ['af', 'at'], poe_full: 'af' },
  },
];

const SERIES = [
  ['C9105', 'Catalyst 9105: Wi-Fi 6 giriş serisi. Satış sonu duyuruldu; yeni projede CW9171/CW9172\'ye bakın.', 'Catalyst 9105: the Wi-Fi 6 entry series. End-of-Sale announced; for new projects look at CW9171/CW9172.'],
  ['C9115', 'Catalyst 9115: Wi-Fi 6, 4x4 iç mekân serisi. Satış sonu duyuruldu; yeni projede CW9174\'e bakın.', 'Catalyst 9115: the Wi-Fi 6, 4x4 indoor series. End-of-Sale announced; for new projects look at CW9174.'],
  ['C9120', 'Catalyst 9120: Wi-Fi 6, 4x4 iç mekân serisi. Satış sonu geldi veya duyuruldu; yeni projede CW9174/CW9176\'ya bakın.', 'Catalyst 9120: the Wi-Fi 6, 4x4 indoor series. End-of-Sale reached or announced; for new projects look at CW9174/CW9176.'],
  ['C9124', 'Catalyst 9124: Wi-Fi 6 dış mekân serisi; dahili, yönlü veya harici antenli seçenekleri vardır.', 'Catalyst 9124: the Wi-Fi 6 outdoor series with built-in, directional or external antenna options.'],
  ['C9130', 'Catalyst 9130: Wi-Fi 6 yüksek kapasiteli iç mekân serisi. Satış sonu duyuruldu; yeni projede CW9178/CW9174\'e bakın.', 'Catalyst 9130: the high-capacity Wi-Fi 6 indoor series. End-of-Sale announced; for new projects look at CW9178/CW9174.'],
  ['C9136', 'Catalyst 9136: 5 GHz\'te 8x8 çalışan, yüksek kapasiteli Wi-Fi 6E iç mekân erişim noktası.', 'Catalyst 9136: a high-capacity Wi-Fi 6E indoor access point with 8x8 on 5 GHz.'],
  ['CBW', 'Cisco Business Wireless: küçük işletmeler için sade, lisanssız Wi-Fi 6 erişim noktaları.', 'Cisco Business Wireless: simple, licence-free Wi-Fi 6 access points for small businesses.'],
  ['CW916x', 'Cisco Wireless 9162-9166: Wi-Fi 6E (6 GHz\'li) iç ve dış mekân erişim noktaları. Şirket içi veya bulut (-MR) yönetimine göre PID değişir.', 'Cisco Wireless 9162-9166: Wi-Fi 6E (with 6 GHz) indoor and outdoor access points. The PID changes with on-premises or cloud (-MR) management.'],
  ['CW917x', 'Cisco Wireless 9171-9179: yeni nesil Wi-Fi 7 erişim noktaları. Tek model hem şirket içi hem bulutla yönetilir; Cisco Ağ Aboneliği gerekir.', 'Cisco Wireless 9171-9179: the new-generation Wi-Fi 7 access points. One model runs on-premises or in the cloud; a Cisco Networking Subscription is needed.'],
  ['IW9165', 'Catalyst IW9165: araçlar, makineler ve raylı sistemler için küçük, sağlam endüstriyel erişim noktaları.', 'Catalyst IW9165: small, rugged industrial access points for vehicles, machines and rail.'],
  ['IW9167', 'Catalyst IW9167: zorlu sanayi ve tehlikeli bölgeler için üç radyolu, sağlam endüstriyel erişim noktaları.', 'Catalyst IW9167: tri-radio, rugged industrial access points for harsh and hazardous sites.'],
  ['MR indoor', 'Meraki MR (iç mekân): Meraki panosuyla bulutta yönetilen iç mekân erişim noktaları. Lisans gerekir.', 'Meraki MR (indoor): indoor access points managed in the cloud from the Meraki dashboard. A licence is needed.'],
  ['MR outdoor', 'Meraki MR (dış mekân): Meraki panosuyla bulutta yönetilen, IP67 korumalı dış mekân erişim noktaları. Lisans gerekir.', 'Meraki MR (outdoor): IP67 outdoor access points managed in the cloud from the Meraki dashboard. A licence is needed.'],
];

const SOURCE_OVERRIDES = {};

const { sheets } = await readWorkbook(workbookPath('wireless'), 'wireless');
const byPid = new Map(sheets.models.map((m) => [m.pid, m]));
let touched = 0;

for (const g of GROUPS) {
  for (const pid of g.pids) {
    const row = byPid.get(pid);
    if (!row) throw new Error(`Unknown PID ${pid}`);
    const [st, se, gt, ge] = g.copy;
    Object.assign(row, {
      summary_tr: st, summary_en: se, good_for_tr: gt, good_for_en: ge,
      licence_note_tr: g.lic?.[0] ?? null, licence_note_en: g.lic?.[1] ?? null,
      licence_required: g.lic ? (g.lic === L.cbw ? false : g.lic === L.c9124 ? null : true) : null,
      poe_note_tr: g.poe?.[0] ?? null, poe_note_en: g.poe?.[1] ?? null,
      variant_note_tr: g.variant?.[0] ?? null, variant_note_en: g.variant?.[1] ?? null,
      ...g.set, ...(g.patch ?? {}),
      source_url: SOURCE_OVERRIDES[pid] ?? row.datasheet_url,
      last_verified: VERIFIED, added_date: ADDED, needs_data: null,
      status: 'ready',
    });
    if (g.mgmt?.[pid]) row.management = g.mgmt[pid];
    if (g.eos) {
      row.lifecycle = g.eos.last_order <= VERIFIED ? 'eos' : 'eos_announced';
      Object.assign(row, {
        eos_announced: '2026-03-30', last_order: g.eos.last_order, ldos: '2031-12-31',
        replacement_pid: g.eos.repl, replacement_note: null, eol_bulletin_url: BULLETIN,
      });
    } else {
      row.lifecycle = 'current';
      Object.assign(row, { eos_announced: null, last_order: null, ldos: null, replacement_pid: null, replacement_note: null, eol_bulletin_url: null });
    }
    row.recommended = null;
    row.recommended_why_tr = null;
    row.recommended_why_en = null;
    touched += 1;
  }
  if (g.recommend && !g.noRecommend) {
    const row = byPid.get(g.recommend[0]);
    row.recommended = true;
    row.recommended_why_tr = g.recommend[1];
    row.recommended_why_en = g.recommend[2];
  }
}

for (const [pid, why] of Object.entries(NOT_READY)) {
  const row = byPid.get(pid);
  row.status = 'draft';
  row.needs_data = why;
}

const seriesByName = new Map(sheets.series.map((s) => [s.series, s]));
for (const [name, tr, en] of SERIES) {
  const s = seriesByName.get(name);
  if (!s) throw new Error(`Unknown series ${name}`);
  Object.assign(s, { series_intro_tr: tr, series_intro_en: en, status: 'ready' });
}

// The EOS replacements point at ready, current PIDs; the validator checks that on the next run.
await writeWorkbook(workbookPath('wireless'), 'wireless', sheets);
const ready = sheets.models.filter((m) => m.status === 'ready').length;
console.log(`wireless.xlsx: ${touched} rows filled, ${ready} ready, ${sheets.models.length - ready} draft`);
