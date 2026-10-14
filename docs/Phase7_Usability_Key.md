# Usability test: moderator answer key

**Moderator only. Never show this page to a participant.** Generated 2026-10-14 by `npm run usability:key` from the published catalog; run it again after any catalog change.

## Task 1: 24-port switch for 10 access points and 8 cameras

Assumption used to judge the answer: 10 access points at about 30 W plus 8 cameras at about 15 W = **420 W** of PoE budget, and 18 PoE ports used. (The site's selector asks "how many PoE devices" and "how much power each", and multiplies; with 24 devices at 30 W it asks for 720 W, so a selector result is always a safe answer.)

**Pass:** the participant names (or opens the page of) a **current** model with 24 ports and a PoE budget of at least 420 W, in under 3 minutes. Any model in the first table passes.

### Passes (20 models)

| Model | Part number | PoE budget | Management | |
| --- | --- | --- | --- | --- |
| C9300LM-24U-4Y | C9300LM-24U-4Y | 420 W | on_prem / cloud |
| C9300-24P | C9300-24P | 445 W | on_prem / cloud |
| C9300-24P-M | C9300-24P-M | 445 W | cloud | recommended
| C9300L-24P-4G | C9300L-24P-4G | 505 W | on_prem / cloud |
| C9300L-24P-4X | C9300L-24P-4X | 505 W | on_prem / cloud | recommended
| C9300L-24P-4X-M | C9300L-24P-4X-M | 505 W | cloud | recommended
| C9300-24UX | C9300-24UX | 560 W | on_prem / cloud |
| C9300-24UX-M | C9300-24UX-M | 560 W | cloud |
| C9300-24UXB | C9300-24UXB | 560 W | on_prem / cloud |
| C9300L-24UXG-2Q | C9300L-24UXG-2Q | 722 W | on_prem / cloud |
| C9300X-24HX | C9300X-24HX | 735 W | on_prem / cloud | recommended
| C9300X-24HX-M | C9300X-24HX-M | 735 W | cloud | recommended
| C1300X-24MU-4X | C1300X-24MU-4X | 740 W | on_prem |
| C1300X-24NGU-4X | C1300X-24NGU-4X | 740 W | on_prem |
| C9300-24H | C9300-24H | 830 W | on_prem / cloud |
| C9300-24U | C9300-24U | 830 W | on_prem / cloud |
| C9300-24U-M | C9300-24U-M | 830 W | cloud |
| C9300-24UB | C9300-24UB | 830 W | on_prem / cloud |
| C9300L-24UXG-4X | C9300L-24UXG-4X | 880 W | on_prem / cloud |
| C9300L-24UXG-4X-M | C9300L-24UXG-4X-M | 880 W | cloud |

### Fails: current 24-port PoE models with too small a budget (30 models)

Choosing one of these is the mistake the site exists to prevent (PoE budget under 420 W). Note whether the site warned the participant.

| Model | Part number | PoE budget | Management | |
| --- | --- | --- | --- | --- |
| C1200-24P-4G | C1200-24P-4G | 195 W | on_prem | recommended
| C1200-24P-4X | C1200-24P-4X | 195 W | on_prem |
| C1300-24P-4G | C1300-24P-4G | 195 W | on_prem |
| C1300-24P-4X | C1300-24P-4X | 195 W | on_prem |
| CBS220-24P-4G | CBS220-24P-4G | 195 W | cisco_business |
| CBS220-24P-4X | CBS220-24P-4X | 195 W | cisco_business |
| C1300-24FP-4G | C1300-24FP-4G | 370 W | on_prem |
| C1300-24FP-4X | C1300-24FP-4X | 370 W | on_prem | recommended
| C9200-24P | C9200-24P | 370 W | on_prem | recommended
| C9200-24PB | C9200-24PB | 370 W | on_prem |
| C9200-24PXG | C9200-24PXG | 370 W | on_prem |
| C9200L-24P-4G | C9200L-24P-4G | 370 W | on_prem / cloud |
| C9200L-24P-4G-M | C9200L-24P-4G-M | 370 W | cloud |
| C9200L-24P-4X | C9200L-24P-4X | 370 W | on_prem / cloud | recommended
| C9200L-24P-4X-M | C9200L-24P-4X-M | 370 W | cloud | recommended
| C9200L-24PXG-2Y | C9200L-24PXG-2Y | 370 W | on_prem / cloud |
| C9200L-24PXG-2Y-M | C9200L-24PXG-2Y-M | 370 W | cloud |
| C9200L-24PXG-4X | C9200L-24PXG-4X | 370 W | on_prem / cloud |
| C9200L-24PXG-4X-M | C9200L-24PXG-4X-M | 370 W | cloud |
| MS130-24P-HW | MS130-24P-HW | 370 W | cloud | recommended
| MS130-24X-HW | MS130-24X-HW | 370 W | cloud |
| MS150-24MP-4X | MS150-24MP-4X | 370 W | cloud |
| MS150-24P-4G | MS150-24P-4G | 370 W | cloud |
| MS150-24P-4X | MS150-24P-4X | 370 W | cloud | recommended
| C1200-24FP-4G | C1200-24FP-4G | 375 W | on_prem |
| C1200-24FP-4X | C1200-24FP-4X | 375 W | on_prem |
| C1300-24MGP-4X | C1300-24MGP-4X | 375 W | on_prem |
| CBS220-24FP-4G | CBS220-24FP-4G | 382 W | cisco_business | recommended
| CBS220-24FP-4X | CBS220-24FP-4X | 382 W | cisco_business |
| C1300X-24P-4X | C1300X-24P-4X | 385 W | on_prem | recommended

Also a fail: an End-of-Sale model (the site should never offer one), a non-PoE switch, or a switch with fewer than 24 ports. Note how they found it (selector "Bana model öner", family page filters, search).

## Task 2: compare two access points

The moderator hands over the two names on a card: **Cisco Wireless 9172I** and **Catalyst 9162I**. They are on the Kablosuz (wireless) page; the participant may also use Karşılaştır or search.

**Pass:** the participant names **one difference that is true**, in their own words. Differences the compare table shows (raw values, in the order of the table):

| Row | Cisco Wireless 9172I | Catalyst 9162I |
| --- | --- | --- |
| wifi_generation | 7 | 6e |
| management | cloud, on_prem | on_prem |
| radio_config | 2x2 (Tri-radio) | 2x2 (2.4 / 5 / 6 GHz) |

A difference that is not in the table can still be true (for example from the model pages): check it against the two model pages before failing the participant. A wrong statement, or no statement, is a fail.

## Task 3: find a new Cisco feature and explain it

**Pass:** the participant opens one story and explains **what it is and what it is for** in their own words (not by reading a line aloud). Accept any of the stories below; the one-line key is what the story is about.

| Story | What it is about (key) |
| --- | --- |
| Live Protect: yama gelene kadar canlı koruma | Müşteriler yama için bakım penceresi beklemek zorunda kalıyor. Live Protect bu boşluğu kapatmayı hedefliyor, ama bugün yalnızca Nexus 9000'de çalışıyor. Kampüs ve şube ürünleri için Cisco tarih vermedi; müşteriye söz vermeyin. |
| Kuantum sonrası şifreleme: şimdiden hazırlanmak | Müşteriler 'kuantum' sorusunu sormaya başlıyor. Doğru cevap korkutmak değil, planlamak: hangi veri uzun süre gizli kalmalı, hangi bağlantılar bu veriyi taşıyor? Cisco'nun tarihleri bir taahhüt ve yol haritasıdır; ürün ve sürüm bazında Cisco'dan doğrulayın. |
| Security Cloud Control: güvenlik ilkeleri tek yerden | Güvenlik ürünü satan bir iş ortağı için güçlü bir konuşma açılışı: yönetim hizmeti uygun ürünü alan müşteriye ek ücretsiz, ek yetenekler abonelikle. Güvenlik ailesi Tools4Us'ta henüz yok; ürün listesi için Cisco'nun sayfasına bakın. |
| Akıllı anahtarlar: C9350, C9550 ve C9610 | Catalyst 9300 ya da Catalyst 3850 yenileyen bir müşteri artık C9350'yi de konuşmalı. C9350, Catalyst 9300 ile aynı yığına girmez ve lisans satın alırken zorunludur; bunu baştan bilmek teklifi düzeltir. |
| Birleşik lisans: Wi-Fi 7 ve yeni anahtarlarda tek abonelik | Lisans türü ve yönetim biçimi aboneliğe bağlıdır. Müşteriyle bunu konuşmadan teklif hazırlarsanız, sonradan lisans taşıma sorusuyla karşılaşırsınız; Cisco bu konuda herkese açık bir kural yayımlamıyor. |

## Task 4: add models to the list and share it

Run this task last, with the models the participant picked in tasks 1 and 2 (if they picked none, ask them to add two models of their own choice first; that is not part of the pass).

**Pass:** the participant produces **a shortlist link or a PDF**: "Bağlantıyı kopyala" and then pastes or sends it (a message to the moderator, a note), or "Yazdır / PDF" and shows the print preview or the saved file. Opening the shortlist page alone is not a pass.

Note: the shortlist is kept in the browser. Use a **private tab** for each participant so the list starts empty.
