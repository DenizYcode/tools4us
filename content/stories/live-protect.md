---
slug_tr: live-protect
slug_en: live-protect
title_tr: "Live Protect: yama gelene kadar canlı koruma"
title_en: "Live Protect: protection while you wait for the patch"
teaser_tr: "Cisco, güvenlik açığı duyurulunca cihazı yeniden başlatmadan geçici bir koruma kalkanı uyguluyor. Bugün hangi ürünlerde, yarın hangilerinde?"
teaser_en: "When a vulnerability is announced, Cisco applies a temporary shield without rebooting the device. Which products today, which later?"
why_tr: "Müşteriler yama için bakım penceresi beklemek zorunda kalıyor. Live Protect bu boşluğu kapatmayı hedefliyor, ama bugün yalnızca Nexus 9000'de çalışıyor. Kampüs ve şube ürünleri için Cisco tarih vermedi; müşteriye söz vermeyin."
why_en: "Customers must wait for a maintenance window to patch. Live Protect aims to close that gap, but today it runs only on Nexus 9000. Cisco gave no dates for campus and branch products, so promise nothing."
category: security
status: ready
published_date: "2026-10-13"
last_verified: "2026-10-13"
review_by: "2027-01-11"
featured: true
order: 3
related_pids: []
cta_family: switching
sources:
  - title: "Shields Up: Cisco Live Protect (Cisco Blogs, 2 Jun 2026)"
    url: "https://blogs.cisco.com/news/shields-up-cisco-live-protect-closes-vulnerability-gap-with-compensating-controls"
  - title: "Real-time data center security mitigation, solution overview (Cisco, updated 10 Feb 2026)"
    url: "https://www.cisco.com/c/en/us/products/collateral/ios-nx-os-software/nx-os-software/real-time-data-center-security-mitigation-so.html"
---

<!-- tr -->

Bir güvenlik açığı duyurulduğunda saldırganlar saatler içinde onu denemeye başlayabilir. Yamayı test edip kurmak ise haftalar, bazen aylar sürer; bakım penceresi ve yeniden başlatma gerekir. Cisco'nun **Live Protect** özelliği bu boşluk için tasarlandı.

## Nasıl çalışıyor?

- Cisco Talos açığın saldırı yolunu inceler ve bir **kalkan** (shield) hazırlar. Cisco mühendisliği kalkanı doğrular.
- Kalkan, çalışan cihaza yeniden başlatma olmadan uygulanır. Teknik olarak çekirdekte çalışan eBPF kullanılır.
- Kalıcı yama kurulunca kalkan kendiliğinden kalkar.
- Üç mod vardır: İzle (yalnızca kaydeder), Uygula (engeller) ve Devre dışı.

Cisco bunu yamanın yerine geçen değil, **geçici bir önlem** olarak anlatıyor.

## Hangi ürünlerde?

- **Bugün:** Cisco Nexus 9000 veri merkezi anahtarları. Cisco belgesine göre Essentials lisansı ya da üstü gerekir.
- **Planlanan:** kampüs ve şube akıllı anahtarları, Catalyst kablosuz denetleyicileri, güvenli yönlendiriciler ve SD-WAN Manager. Cisco 2 Haziran 2026 yazısında "önümüzdeki aylarda" diyor, tarih vermiyor ve zamanlamanın değişebileceğini belirtiyor.

Tools4Us'taki Catalyst, Meraki ve yönlendirici modelleri için bugün Live Protect sözü vermeyin.

<!-- en -->

When a vulnerability is announced, attackers can start trying it within hours. Testing and installing the patch takes weeks, sometimes months, and needs a maintenance window and a reboot. Cisco's **Live Protect** is designed for that gap.

## How does it work?

- Cisco Talos studies the attack path and prepares a **shield**. Cisco engineering validates the shield.
- The shield is applied to the running device without a reboot. Technically it uses eBPF, which runs inside the operating-system kernel.
- When the permanent patch is installed, the shield is retired automatically.
- There are three modes: Monitor (only logs), Enforce (blocks) and Disable.

Cisco describes it as a **temporary measure**, not a replacement for the patch.

## Which products?

- **Today:** Cisco Nexus 9000 data center switches. Cisco's documentation says an Essentials licence or higher is needed.
- **Planned:** campus and branch Smart Switches, Catalyst wireless controllers, secure routers and SD-WAN Manager. Cisco's 2 June 2026 post says "over the coming months", gives no dates and says the timing may change.

Do not promise Live Protect on the Catalyst, Meraki and router models on Tools4Us today.
