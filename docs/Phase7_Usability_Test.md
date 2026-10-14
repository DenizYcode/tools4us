# Usability test: how to run it

SPEC "Done when": five Turkish users with little Cisco knowledge each complete four tasks on a phone, in Turkish, without help. Launch needs **at least 4 of 5 participants to pass every task**.

Files in this kit:

| File | For | What |
| --- | --- | --- |
| this page | you | recruiting, setup, rules, the script to read aloud (Turkish) |
| `docs/Phase7_Usability_Key.md` | you only | what counts as a pass, generated from the catalog (`npm run usability:key`) |
| `docs/Phase7_Usability_Scoring.xlsx` | you | blank scoring sheet; save a filled copy outside the repo (`npm run usability:sheet` recreates the blank) |
| `docs/Phase7_Usability_Results.md` | you | where the outcome is recorded; `npm run check:launch` reads its `Result:` line |

## Before you start

1. **Push first.** Test the live site (`https://denizycode.github.io/tools4us/tr/`), not localhost: it is what the participants will get, and the real network speed shows.
2. **Five participants.** Turkish adults who read Turkish on a phone and have little or no Cisco or networking knowledge: for example an office manager, a shop owner, a bookkeeper, a relative who buys IT things for a small business. Not network engineers, not anybody who has seen the site, not people who work with you. Mix Android and iOS and ages if you can.
3. **Their own phone** if they agree (the real keyboard and browser), otherwise one phone for all, with the browser's saved data cleared between people. Mobile data or ordinary Wi-Fi, not your fastest connection.
4. **A private tab for each person.** The shortlist lives in the browser; a fresh private tab means it starts empty. Close the tab at the end.
5. **A timer** and the scoring sheet open on your laptop. Recording is optional and only with their written yes (see the consent note).
6. **A card with two names** for task 2 (the names are in the key).
7. A messaging app or notes app on the phone to receive the link in task 4 (you can sit next to them and ask them to send it to you).

## Rules while they work

- Say nothing that helps. Do not point, do not explain a word, do not say "try the filter". If they ask, answer "Ne yapardınız?" ("What would you do?") and wait.
- Ask them to think aloud: "Aklınızdan geçenleri yüksek sesle söyleyin."
- Time limits: task 1 is 3 minutes (the SPEC bar). For tasks 2 to 4 stop at 5 minutes. When time is up, say "Teşekkürler, bir sonrakine geçelim", mark the task N and move on. Never reveal the answer.
- Write down what you see (where they hesitate, what they tap, words they read aloud with a question in their voice), not what you think. Real problems go to the Findings sheet.
- Do not defend the site. Say "Çok işime yarıyor" ("that helps me") for everything, good or bad.

## What you read aloud (Turkish)

**Opening (read slowly):**

> Merhaba, geldiğiniz için teşekkürler. Bir internet sitesini deniyoruz; sizi değil, siteyi test ediyoruz. Yanlış cevap yok. Takılırsanız bu sitenin eksikliğidir, sizin değil. Size dört küçük görev vereceğim. Görev sırasında size yardım edemeyeceğim, çünkü sitenin tek başına anlaşılır olup olmadığını görmek istiyoruz. Düşündüklerinizi yüksek sesle söylerseniz çok yardımcı olursunuz. İstediğiniz an durabilirsiniz. Süreleri not alıyorum; amaç sizi ölçmek değil. Hazır mısınız?

**Start page:** open `https://denizycode.github.io/tools4us/tr/` in a private tab and hand over the phone. Say nothing about the site.

**Task 1**

> Bir ofisiniz için ağ cihazı arıyorsunuz. 10 erişim noktasını ve 8 kamerayı besleyecek, 24 portlu bir anahtar (switch) bulun. Bulduğunuzda "buldum" deyin ve hangi model olduğunu söyleyin.

*(Start the timer. Do not explain "PoE", "erişim noktası" or "switch".)*

**Task 2** *(hand over the card with the two names)*

> Kartta iki erişim noktasının adı yazıyor. Bu ikisini karşılaştırın ve aralarındaki bir farkı bana söyleyin.

**Task 3**

> Cisco'nun yeni bir özelliğini bulun ve bana ne işe yaradığını kendi cümlelerinizle anlatın.

**Task 4** *(after tasks 1 and 2, so they have models to add)*

> Az önce seçtiğiniz modelleri bir listeye ekleyin ve bu listeyi bana gönderebileceğiniz bir şekilde paylaşın.

**After each task, ask one question:**

> Bu görev sizce ne kadar kolaydı? 1 çok zor, 5 çok kolay.

**Closing questions (write the answers down, no leading):**

1. Sitede anlamadığınız bir kelime ya da bir yer oldu mu? Hangisi?
2. Sizi en çok zorlayan an hangisiydi?
3. Bu siteyi iş için kullanır mıydınız? Neden?

> Çok teşekkürler, çok yardımcı oldunuz.

## Consent note (read, then ask for a yes)

> Bu test yaklaşık 20 dakika sürer. Adınızı yazmıyorum; sizi P1, P2 gibi bir kodla not alıyorum, yaşınızı aralık olarak, telefonunuzun modelini yazıyorum. Notlar yalnızca siteyi geliştirmek için kullanılır ve kimseyle kişisel olarak paylaşılmaz. İsterseniz ekran ve ses kaydı alabilirim; bunun için ayrıca "evet" demeniz gerekir ve kayıt kimseye gönderilmez, test sonrası silinir. Dilediğiniz an durabilirsiniz; bu durumda notlarınız silinir. Kabul ediyor musunuz?

If they say yes to recording, note it on the sheet ("recorded: yes") and delete the file after you have copied the observations. This note is a plain courtesy for a five-person test; if you plan to keep recordings or collect names, ask a lawyer (KVKK).

## Pass and fail

The key page says what counts as a pass for each task. Short version:

| Task | Pass if |
| --- | --- |
| 1 | Names a current 24-port PoE switch whose PoE budget is at least 420 W, in under 3 minutes |
| 2 | States one difference between the two access points that is true |
| 3 | Opens a story and explains what it is and what it is for, in their own words |
| 4 | Produces a shortlist link (copied and pasted or sent) or a PDF |

If a participant passes only because you helped, it is an N.

## After five participants

1. Fill the sheet (the Summary tab counts for you). Save the filled copy outside the repo (or anywhere you like; it holds no names).
2. Copy the table and the problems into `docs/Phase7_Usability_Results.md`. Set `Result: PASS` only when the Summary says PASS for every task. Otherwise leave `Result: FAIL`, list the blockers and send me the findings: I plan the fixes, then you test again with new people (not the same five).
3. Fix first what several people hit and what blocked a task. A confusing word usually means a missing glossary tooltip, a wrong default or a button label to change; those are small.
4. Run `npm run check:launch` again.

## What to watch for (known risks)

- **Task 1:** do they understand "PoE" and the watts question of the selector ("Bana model öner")? The options carry examples (phone, camera, Wi-Fi 6 access point), but a person may still guess. Do they find the selector from the hub, or do they scroll the family page?
- **Task 2:** do they find "Karşılaştır" or tick the boxes on the family page? Is the "fark var" tag noticed?
- **Task 3:** the stories are in the nav as "Yenilikler". Do they connect "yeni özellik" with it? Can they explain "Neden önemli?" in their own words?
- **Task 4:** "Seçimlerime ekle" then the "Seçimlerim" link in the header (with a count). Do they find "Bağlantıyı kopyala" or "Yazdır / PDF"?
