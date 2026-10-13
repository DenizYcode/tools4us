---
slug_tr: kuantum-sonrasi-sifreleme
slug_en: post-quantum-cryptography
title_tr: "Kuantum sonrası şifreleme: şimdiden hazırlanmak"
title_en: "Post-quantum cryptography: preparing now"
teaser_tr: "Bugün kaydedilen şifreli trafik yarın çözülebilir. Cisco ne yapıyor, WAN'da bugün ne var, müşteriye ne söylemeli?"
teaser_en: "Encrypted traffic recorded today could be decrypted tomorrow. What Cisco is doing, what the WAN has today, and what to tell customers."
why_tr: "Müşteriler 'kuantum' sorusunu sormaya başlıyor. Doğru cevap korkutmak değil, planlamak: hangi veri uzun süre gizli kalmalı, hangi bağlantılar bu veriyi taşıyor? Cisco'nun tarihleri yol haritasıdır, söz değildir."
why_en: "Customers are starting to ask about quantum. The right answer is to plan, not to scare: which data must stay secret for years, and which links carry it? Cisco's dates are a roadmap, not a promise."
category: new
status: ready
published_date: "2026-10-13"
last_verified: "2026-10-13"
review_by: "2027-01-11"
featured: true
order: 4
related_pids: []
cta_family: routing
sources:
  - title: "Post-Quantum Cryptography (Cisco Trust Center)"
    url: "https://www.cisco.com/site/us/en/about/trust-center/post-quantum-cryptography.html"
  - title: "Safeguard Your WAN from Quantum Computing Threats (Cisco Blogs, 13 Jan 2026)"
    url: "https://blogs.cisco.com/networking/safeguard-your-wan-from-quantum-computing-threats"
---

<!-- tr -->

Yeterince güçlü bir kuantum bilgisayar bugünkü açık anahtarlı şifrelemeyi kırabilir. Bu yüzden iki risk var. Cisco bunları şöyle adlandırıyor:

- **"Şimdi topla, sonra çöz"** (Harvest Now, Decrypt Later): saldırgan şifreli trafiği bugün kaydeder, bilgisayar hazır olunca çözer.
- **"Şimdi güven, sonra sahtele"** (Trust Now, Forge Later): bugün geçerli sayılan dijital imzalar sonradan taklit edilebilir.

## Cisco ne söylüyor?

Cisco, çekirdek ürün portföyünün çoğunda kuantum güvenli iletişimi **Aralık 2026'ya kadar** sunmayı taahhüt ediyor ve ürün bazlı tarihleri olan bir yol haritası yayımladı. Plan iki alanda ilerliyor: veri aktarımındaki protokoller (IPsec, TLS, MACsec) ve cihazın kendisi (donanım güven kökü, güvenli önyükleme, imza ve güncelleme doğrulama).

## WAN'da bugün ne var?

Cisco'nun 13 Ocak 2026 tarihli yazısına göre Cisco 8000 serisi güvenli yönlendiriciler bugün **önceden paylaşılan anahtarı** (PPK) IKEv2 anahtar değişimine katabiliyor. Anahtar yerel olarak girilebilir ya da bir kuantum anahtar dağıtım (QKD) sisteminden gelebilir. Cisco aynı yönlendiricilerin ileride yerleşik (native) kuantum sonrası şifreleme sunacağını söylüyor; yazıda sürüm numarası ya da tarih yok.

Bu yönlendiriciler Tools4Us'ta henüz yer almıyor.

## Müşteriye ne önerilir?

Cisco'nun önerisi sade: önce hangi verinin ve hangi bağlantının riskli olduğunu çıkarın, hassas veriye öncelik verin ve geçişi aşamalı planlayın.

<!-- en -->

A powerful enough quantum computer could break today's public-key encryption. That creates two risks, which Cisco names:

- **Harvest Now, Decrypt Later:** an attacker records encrypted traffic today and decrypts it when the computer is ready.
- **Trust Now, Forge Later:** digital signatures that count as valid today could be forged afterwards.

## What does Cisco say?

Cisco commits to delivering quantum-safe communications across most of its core portfolio **by December 2026** and has published a roadmap with product milestones. The plan covers two areas: the protocols that carry data (IPsec, TLS, MACsec) and the device itself (hardware root of trust, secure boot, signing and update verification).

## What does the WAN have today?

According to Cisco's blog post of 13 January 2026, the Cisco 8000 Series Secure Routers can today mix a **pre-shared key** (PPK) into the IKEv2 key exchange. The key can be entered locally or come from a quantum key distribution (QKD) system. Cisco says the same routers will later offer native post-quantum encryption; the post gives no release number or date.

These routers are not on Tools4Us yet.

## What to suggest to a customer

Cisco's advice is simple: first list which data and which links are at risk, put sensitive data first and plan the move in phases.
