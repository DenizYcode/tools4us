// Phase 4: adds the switching and routing terms to data/glossary.xlsx (existing terms are kept, terms with
// the same key are replaced, so the script is idempotent). Turkish text is a draft that needs native review.

import { GLOSSARY_PATH, readGlossary, writeGlossary } from '../glossary.mjs';

const NEW = [
  ['stacking', 'Yığınlama (stacking)', 'Stacking', 'Birkaç anahtarı özel kablolarla birbirine bağlayıp tek bir anahtar gibi yönetmek. Port sayısı büyür; biri bozulsa da ağ çalışmaya devam eder.', 'Joining several switches with special cables and managing them as one switch. The port count grows, and the network keeps working if one fails.'],
  ['layer3', 'Katman 3 (yönlendirme)', 'Layer 3 (routing)', "Anahtarın farklı ağlar (VLAN'lar) arasında trafiği yönlendirebilmesi. Katman 2 anahtar yalnızca aynı ağ içinde çalışır; katman 3 modeller ayrı bir yönlendirici ihtiyacını azaltır.", 'The switch can route traffic between different networks (VLANs). A layer 2 switch only works inside one network; layer 3 models reduce the need for a separate router.'],
  ['poe_budget', 'PoE bütçesi', 'PoE budget', 'Anahtarın tüm PoE portlarına toplamda verebildiği güç (watt). Bağlayacağınız cihazların toplam gücünden büyük olmalı. Bazı modellerde seçtiğiniz güç kaynağına göre değişir.', 'The total power (watts) a switch can give to all its PoE ports. It must be bigger than the total power of the devices you connect. On some models it depends on the power supply you choose.'],
  ['uplink', 'Yukarı bağlantı (uplink)', 'Uplink', "Anahtarı ağın merkezine veya başka bir anahtara bağlayan hızlı portlar. Çok cihaz aynı anda konuşacaksa 10 Gb/s ve üzerini tercih edin.", 'The fast ports that connect the switch to the core of the network or to another switch. Choose 10 Gb/s or more when many devices talk at the same time.'],
  ['throughput', 'Yönlendirme hızı (throughput)', 'Routing speed (throughput)', 'Yönlendiricinin saniyede iletebildiği veri miktarı. Veri sayfalarındaki değer, en uygun koşullardaki en yüksek değerdir; VPN ve güvenlik özellikleri açıkken düşer.', 'The amount of data a router can forward per second. The datasheet value is the highest under the best conditions; it drops with VPN and security features on.'],
  ['security_throughput', 'Şifreli veya gelişmiş güvenlik hızı', 'Encrypted or advanced security speed', 'VPN (IPsec) şifrelemesi veya gelişmiş güvenlik duvarı (NGFW) açıkken ulaşılan hız. Çoğu zaman yönlendirme hızından düşüktür ve bir lisansa bağlı olabilir.', 'The speed with VPN (IPsec) encryption or the next-generation firewall (NGFW) switched on. It is usually lower than the routing speed and can depend on a licence.'],
  ['sd_wan', 'SD-WAN', 'SD-WAN', 'Şubeleri birden fazla internet hattı üzerinden akıllıca bağlayan yazılım tabanlı ağ. Bir hat koparsa trafik otomatik olarak diğer hatta geçer.', 'A software-driven network that connects branches smartly over several internet links. If one link fails, traffic moves to the other automatically.'],
  ['cellular_backup', 'Hücresel yedek hat (LTE/5G)', 'Cellular backup (LTE/5G)', 'Kablolu internet koptuğunda SIM kartlı LTE/5G hattı ile ağın çalışmaya devam etmesi. Modem cihazın içinde olabilir veya takılabilir modül olarak alınır; SIM ve hat ayrıca gerekir.', 'Keeping the network running over a LTE/5G link with a SIM card when the wired internet fails. The modem can be built in or a pluggable module; the SIM and the plan are extra.'],
  ['module_slots', 'Modül yuvası (NIM / SM / PIM)', 'Module slot (NIM / SM / PIM)', 'Yönlendiriciye sonradan ek port, ses, depolama veya hücresel modem eklemeyi sağlayan yuvalar.', 'Slots that let you add ports, voice, storage or a cellular modem to the router later.'],
].map(([key, term_tr, term_en, meaning_tr, meaning_en]) => ({ key, term_tr, term_en, meaning_tr, meaning_en }));

const { terms } = await readGlossary(GLOSSARY_PATH);
const keep = terms.filter((t) => !NEW.some((n) => n.key === t.key));
await writeGlossary(GLOSSARY_PATH, [...keep, ...NEW]);
console.log(`glossary: ${keep.length} kept, ${NEW.length} added or replaced`);
