// One-time seed of data/glossary.xlsx with the wireless terms Phase 3 needs. After that the file is
// edited by hand, so this refuses to overwrite it (pass --force to regenerate and lose edits).
// Turkish text is a draft that needs native review.

import { existsSync } from 'node:fs';
import { GLOSSARY_PATH, writeGlossary } from '../glossary.mjs';

const TERMS = [
  ['access_point', 'Erişim noktası (access point)', 'Access point', 'Ağ kablosuna bağlanan ve Wi-Fi sinyalini yayan cihaz. Telefonlar ve bilgisayarlar ona kablosuz bağlanır.', 'The device that plugs into the network cable and broadcasts the Wi-Fi signal. Phones and laptops connect to it wirelessly.'],
  ['wifi_6', 'Wi-Fi 6 (802.11ax)', 'Wi-Fi 6 (802.11ax)', 'Önceki nesil Wi-Fi. 2,4 ve 5 GHz bantlarında çalışır. Yeni projelerde artık Wi-Fi 7 öneriyoruz.', 'The previous Wi-Fi generation. Works on the 2.4 and 5 GHz bands. For new projects we now look at Wi-Fi 7.'],
  ['wifi_6e', 'Wi-Fi 6E', 'Wi-Fi 6E', "Wi-Fi 6'nın 6 GHz bandını da kullanan sürümü. 6 GHz daha az kalabalıktır.", 'Wi-Fi 6 extended to the 6 GHz band, which is less crowded.'],
  ['wifi_7', 'Wi-Fi 7 (802.11be)', 'Wi-Fi 7 (802.11be)', 'En yeni Wi-Fi nesli. 2,4, 5 ve 6 GHz bantlarını birlikte kullanır; yoğun ortamlarda daha hızlı ve daha kararlıdır.', 'The newest Wi-Fi generation. Uses 2.4, 5 and 6 GHz together and stays faster and steadier in busy places.'],
  ['six_ghz', '6 GHz bandı', '6 GHz band', "Wi-Fi 6E ve Wi-Fi 7 cihazlarının kullandığı geniş ve boş bant. Türkiye'de kullanımı BTK kurallarına bağlıdır; kurulumdan önce güncel durumu doğrulayın.", 'The wide, uncrowded band used by Wi-Fi 6E and Wi-Fi 7 devices. In Türkiye its use depends on BTK rules; confirm the current status before installing.'],
  ['poe', 'PoE (Power over Ethernet)', 'PoE (Power over Ethernet)', 'Cihazın elektriğini ağ kablosundan almasını sağlar. Ayrı bir prize gerek kalmaz ama anahtarın (switch) yeterli güç vermesi gerekir.', 'Lets a device take its power from the network cable, so it needs no separate socket. The switch must be able to supply enough power.'],
  ['poe_af', '802.3af (PoE)', '802.3af (PoE)', 'En düşük PoE sınıfı. Portta yaklaşık 15 W verir. Yeni erişim noktalarının çoğu için yetmez.', 'The lowest PoE class, about 15 W at the port. Not enough for most new access points.'],
  ['poe_at', '802.3at (PoE+)', '802.3at (PoE+)', 'Portta yaklaşık 30 W verir. Birçok erişim noktası bununla çalışır, ancak bazıları tüm özelliklerini açamaz.', 'About 30 W at the port. Many access points run on it, but some cannot switch on every feature.'],
  ['poe_bt', '802.3bt (PoE++ / UPOE)', '802.3bt (PoE++ / UPOE)', 'Portta 60 W veya 90 W verir. En güçlü erişim noktaları tüm özellikleri için buna ihtiyaç duyar.', 'Gives 60 W or 90 W at the port. The most capable access points need it for all their features.'],
  ['poe_full', 'Tam işlev için gereken PoE', 'PoE needed for full function', 'Erişim noktası daha zayıf PoE ile açılabilir ama bazı özellikleri kapanır veya hızı düşer. Burada yazan, hiçbir şeyden vazgeçmeden çalışması için gereken sınıftır.', 'The access point may power up on weaker PoE but lose features or speed. This is the class it needs to work without giving anything up.'],
  ['mgig', 'mGig (multigigabit)', 'mGig (multigigabit)', "Mevcut Cat5e/Cat6 kablo üzerinden 2,5, 5 veya 10 Gb/s hız sağlayan ağ bağlantısı. Hızlı erişim noktalarının 1 Gb/s'ye takılmamasını sağlar.", 'A network link of 2.5, 5 or 10 Gb/s over existing Cat5e/Cat6 cable, so fast access points are not held back by a 1 Gb/s port.'],
  ['on_prem', 'Şirket içi yönetim (on-prem)', 'On-premises management (on-prem)', 'Cihazlar sizin sunucunuzda veya cihazınızda çalışan bir yazılımla yönetilir, örneğin Catalyst Center ya da kablosuz denetleyici.', 'Devices are managed by software that runs on your own server or appliance, for example Catalyst Center or a wireless controller.'],
  ['cloud', 'Bulut yönetimi (cloud)', 'Cloud management', 'Cihazlar internet üzerinden Meraki panosuyla yönetilir. Kurulum ve izleme tarayıcıdan yapılır.', 'Devices are managed over the internet from the Meraki dashboard. Setup and monitoring happen in a browser.'],
  ['cisco_business', 'Cisco Business', 'Cisco Business', 'Küçük işletmeler için sade, düşük bakım gerektiren seri. Yönetim cihazın kendi arayüzünden veya basit bir uygulamadan yapılır.', 'A simple, low-maintenance range for small businesses, managed from the device itself or a simple app.'],
  ['licence_subscription', 'Abonelik lisansı', 'Subscription licence', 'Bu modelin çalışması için süreli bir lisans gerekir. Lisans olmadan cihaz yönetilemez veya özellikleri kapanır. Süre ve seviyeyi Cisco iş ortağınızla netleştirin.', 'This model needs a term licence to work. Without it the device cannot be managed or loses features. Agree the term and tier with your Cisco partner.'],
  ['cleanair', 'CleanAir', 'CleanAir', 'Wi-Fi sinyalini bozan parazitleri (mikrodalga fırın, kablosuz kamera gibi) bulup gösterir.', 'Finds and shows interference that disturbs the Wi-Fi signal, such as microwave ovens or wireless cameras.'],
  ['security_radio', 'Güvenlik radyosu (security radio)', 'Security radio', 'Wi-Fi hizmetini aksatmadan çevredeki yetkisiz cihazları ve saldırıları arayan ayrı bir radyo.', 'A separate radio that looks for rogue devices and attacks without taking away Wi-Fi capacity.'],
  ['air_marshal', 'Air Marshal', 'Air Marshal', "Meraki'nin çevredeki yetkisiz erişim noktalarını bulan ve engelleyen güvenlik özelliği.", "Meraki's security feature that detects and contains rogue access points nearby."],
  ['uwb', 'UWB (ultra-wideband)', 'UWB (ultra-wideband)', 'Cihaz ve kişi konumunu çok hassas bulmak için kullanılan ek radyo.', 'An extra radio used to locate devices and people very precisely.'],
  ['gnss_gps', 'GNSS / GPS', 'GNSS / GPS', 'Cihazın konumunu uydudan öğrenmesini sağlayan alıcı.', 'A receiver that lets the device learn its position from satellites.'],
  ['urwb', 'URWB (Ultra-Reliable Wireless Backhaul)', 'URWB (Ultra-Reliable Wireless Backhaul)', 'Hareketli araçlar ve geniş sahalar için kesintisiz kablosuz bağlantı sağlayan çalışma modu.', 'An operating mode for uninterrupted wireless links to moving vehicles and wide sites.'],
  ['end_of_sale', 'Satış sonu (End-of-Sale)', 'End-of-Sale', 'Cisco bu modelin satışını bitirdi veya bitireceğini duyurdu. Yeni proje için önermeyin; yerine geçen modele bakın.', 'Cisco has stopped, or announced it will stop, selling this model. Do not propose it for new projects; look at its replacement.'],
  ['last_order', 'Son sipariş tarihi', 'Last order date', "Bu modelin Cisco'dan sipariş edilebileceği son gün.", 'The last day this model can be ordered from Cisco.'],
  ['ldos', 'Son destek tarihi (last date of support)', 'Last date of support (LDoS)', "Cisco'nun bu model için destek vermeyi bırakacağı tarih.", 'The date Cisco stops supporting this model.'],
].map(([key, term_tr, term_en, meaning_tr, meaning_en]) => ({ key, term_tr, term_en, meaning_tr, meaning_en }));

if (existsSync(GLOSSARY_PATH) && !process.argv.includes('--force')) {
  console.error('data/glossary.xlsx already exists and is edited by hand. Pass --force to regenerate it (loses edits).');
  process.exit(1);
}
await writeGlossary(GLOSSARY_PATH, TERMS);
console.log(`wrote ${TERMS.length} terms to data/glossary.xlsx`);
