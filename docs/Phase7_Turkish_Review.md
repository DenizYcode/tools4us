# Turkish review: how to run it and the result

`npm run check:launch` shows this check as passed only when the line below says `Result: PASS`. Set it after a native Turkish speaker has been through the whole sheet and every correction is applied (or answered).

Result: PENDING

## How it works

1. **Export.** `npm run review:export` writes `docs/Phase7_Turkish_Review.xlsx` (not committed; regenerate any time). 1397 rows: UI strings, the KVKK and form texts, the five stories, the glossary, the series explainers and the model templates (a text used by 40 models is one row with `used_by` 40). The English twin is next to each row. The "Read me" sheet explains it in Turkish and English.
2. **Review.** The reviewer writes the full new text in `turkish_suggested` and nothing else. Rows are sorted from most visible to least visible, so a short review can stop after the stories. `status` is optional: `soru` (question, with a `note`) and `atla` (skip) are never applied.
3. **Dry run.** Save the reviewed file anywhere and run:

   ```bash
   npm run review:apply -- path/to/reviewed.xlsx
   ```

   It reads the corrections and reports what would change, what it refused and why (a `{placeholder}` that went missing, a link address that changed, text that was edited in the repo after the export), and the reviewer's questions. It writes nothing.
4. **Apply.** Commit or stash other changes first (it refuses to touch a file with uncommitted changes), then add `--write`:

   ```bash
   npm run review:apply -- path/to/reviewed.xlsx --write
   ```

   Each correction goes back to its own place: one line of `src/i18n/tr.json`, every catalog row that holds the old text (`data/catalog/*.xlsx`, published and draft rows share templates), a glossary entry, a story frontmatter line or one paragraph of a story's Turkish section.
5. **Check.** `npm run check:data && npm run build && npm run test:data`, then read `git diff` and commit.
6. **Re-export** before a second round: the sheet reflects the current text, so row numbers change.

The KVKK rows ("KVKK ve form", "Footer disclaimer") also go to the lawyer: see `docs/Phase7_KVKK_Checklist.md`. Wording changes there need the lawyer's yes.

## House rules for the reviewer

Plain Turkish, short sentences, written for a person who does not know networking. A technical term needs its Turkish word first and the English in brackets: "Erişim noktası (access point)". Product names are not translated. No price, ordering or stock wording. Keep `{name}`-style parts, `**bold**` marks and link addresses exactly.

## Result

| Date | Reviewer | Rows reviewed | Corrections applied | Questions open |
| --- | --- | --- | --- | --- |
| | | | | |

Notes:
