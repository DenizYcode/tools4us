---
slug_tr: birlesik-lisans
slug_en: unified-licensing
title_tr: "Birleşik lisans: Wi-Fi 7 ve yeni anahtarlarda tek abonelik"
title_en: "Unified licensing: one subscription for Wi-Fi 7 and new switches"
teaser_tr: "Wi-Fi 7 ve yeni anahtarlarda lisans, cihaza değil ağa bağlanıyor. Neyi bildiğimizi, neyi Cisco'ya sormanız gerektiğini yazdık."
teaser_en: "On Wi-Fi 7 and the new switches the licence follows the network, not the device. What is documented, and what to ask Cisco."
why_tr: "Lisans türü ve yönetim biçimi aboneliğe bağlıdır. Müşteriyle bunu konuşmadan teklif hazırlarsanız, sonradan lisans taşıma sorusuyla karşılaşırsınız; Cisco bu konuda herkese açık bir kural yayımlamıyor."
why_en: "The licence type and management mode belong to the subscription. If you quote without discussing them, you will meet the licence-transfer question later, and Cisco publishes no public rule for it."
category: licence
status: ready
published_date: "2026-10-13"
last_verified: "2026-10-13"
review_by: "2027-01-11"
featured: true
order: 1
related_pids:
  - CW9172I-RTG
  - CW9176I-RTG
cta_family: wireless
sources:
  - title: "Cisco Networking Subscription Licensing (Meraki Documentation)"
    url: "https://documentation.meraki.com/Platform_Management/Product_Information/Meraki_Licensing/Subscription_Licensing"
  - title: "Cisco C9000 Smart Switching Platform FAQ"
    url: "https://www.cisco.com/c/en/us/products/collateral/switches/catalyst-9000-switches/c9000-smart-switches-faq.html"
---

<!-- tr -->

Cisco, Meraki ve Catalyst ürünlerini tek bir abonelik modeline topluyor: **Cisco Networking Subscription** (Cisco Ağ Aboneliği). Meraki'nin belgelerine göre bu abonelik Cisco 8000 serisi güvenli yönlendiricileri, Cisco akıllı anahtarları, Wi-Fi 7 kablosuz ürünleri ve Meraki MX, MS, MR gibi cihazları kapsıyor.

## Ne değişiyor?

- Abonelik tek bir cihaza değil, bir cihaz ailesine bağlı. Tek bir abonelik kalemi (SKU) aynı model ailesindeki birden çok cihazı kapsayabilir.
- Süre 12 ile 84 ay arasında ve başlangıç-bitiş tarihini müşteri seçer. En kısa süre Meraki ve kablosuz ürünlerde 12 ay, C9350 ve C9610 anahtarlarda 36 aydır.
- **Birleşik lisansta** (unified) yönetim biçimi seçilebilir: bulut, karma ya da yerinde (on-premises). Meraki belgesi bu seçimi yalnızca Wi-Fi 7, C9350 ve C9610 için anıyor.
- Abonelik anahtarı bir kez sahiplenilir (claim). Sonraki değişiklikler yeni anahtar gerektirmeden kendiliğinden yansır.
- Abonelik kuruluşun tamamına değil, bir ağa (network) bağlanır. Bir ağ aynı anda tek aboneliğe bağlanır; aynı kuruluştaki birkaç ağ aynı aboneliği paylaşabilir.

## Lisans taşıma: bilmediklerimiz

Cisco'nun herkese açık sayfaları, bir aboneliğin cihazlar, kuruluşlar ya da yönetim biçimleri arasında taşınıp taşınamayacağını söylemiyor. Eski eş-bitişli (co-term) lisans düzenindeki taşıma adımlarının abonelikler için de geçerli olduğunu varsaymayın. Müşteriye söz vermeden önce Cisco ya da Meraki'ye yazılı sorun.

Bilinen iki sınır var: etkin co-term ya da cihaz başı (PDL) lisansı olan bir kuruluş abonelik sahiplenemez, ve PDL'den aboneliğe geçiş için destek kaydı açmak gerekir; bu geçiş geri alınamaz.

<!-- en -->

Cisco is moving its Meraki and Catalyst products onto one subscription model: the **Cisco Networking Subscription**. According to Meraki's documentation it covers the Cisco 8000 Series Secure Routers, Cisco Smart Switches, Wi-Fi 7 wireless products and Meraki devices such as MX, MS and MR.

## What changes?

- The subscription follows a device family, not a single device. One subscription item (SKU) can cover several devices of the same model family.
- Terms run from 12 to 84 months, and the customer picks the start and end dates. The shortest term is 12 months for Meraki and wireless products and 36 months for the C9350 and C9610 switches.
- With **unified licensing** you can choose the management mode: cloud, mixed or on-premises. Meraki's page names only Wi-Fi 7, C9350 and C9610 for this choice.
- A subscription key is claimed once. Later changes apply by themselves, with no new key.
- A subscription binds to a network, not to the whole organisation. A network binds to one subscription at a time, and several networks in one organisation can share a subscription.

## Moving a licence: what we do not know

Cisco's public pages do not say whether a subscription can be moved between devices, organisations or management modes. Do not assume the steps of the older co-term licence system apply to subscriptions. Ask Cisco or Meraki in writing before you promise anything to a customer.

Two limits are documented: an organisation with an active co-term or per-device (PDL) licence cannot claim a subscription, and moving from PDL to a subscription needs a support case and cannot be undone.
