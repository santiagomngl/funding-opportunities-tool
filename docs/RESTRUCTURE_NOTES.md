# Restructure notes

15 November 2026. What changed when the web app was connected to the agent data files, and what is still open.

## Read this first

1. **Both attached FO records fail the gate.** `earliest_project_start_date` and `project_end_date` are `null` in `20261115-125155-01` and `20261115-130249-01`; SA_agent.md says they are always filled. I placed the files unchanged, because filling the dates is the SA agent's job. The site still shows both records, without a timing filter, and `npm run check-data` reports `FAIL` for both. Re-run the SA agent on them (or the date helper) before relying on the data.
2. **The developer report was not in the work package**, so `docs/` holds only this file. I built section 8.1 (the Q6 end range) and 8.2 (the match score) from the description in the prompt. Add the report to `docs/` and check those two against it.
3. **No Vercel setting has to change** (section 6).

## 1. Folder tree

```
SA_agent.md            SA agent instructions, with the date helper and the gate programme
RE_agent.md            RE agent instructions
templates/             the five blank *.template.json files
resources/             what the agents read
  tennet_taxonomy.json   Topic, Role, Activity, Outcome values (also drives the questionnaire)
  call_types.json        categories of each call type
  sources/               one file per source (3 attached)
  projects/              one file per TenneT project (34 attached)
data/                  what the agents write
  fo_records/            one record per call (2 attached)
  fo_reports/            one report per record (2 attached)
pdfs/                  PDFs the agents download; only .gitkeep is committed
docs/                  these notes; the developer report goes here
web/                   the web app
  src/                   screens (App.tsx, components/) and logic (lib/)
  build/                 load-data.mjs: reads and checks the data files for the site
  scripts/               check-data.mjs
  tests/                 unit tests; fake fixtures are generated in tests/helpers/
  public/, vendor/       logo, fonts, vendored CSS
package.json           shortcuts: setup, check-data, dev, build, preview, test
vercel.json            Vercel build settings
README.md
```

Every path named in SA_agent.md and RE_agent.md exists. `data/fo_records/`, `data/fo_reports/` and `pdfs/` each hold a `.gitkeep`, so they survive when empty. The agents' scripts read only `*.json`, so `.gitkeep` does not disturb them.

I kept the web app in `web/`, as proposed. The root then holds only what agents and maintainers read.

### How the web app gets its data

- `web/build/load-data.mjs` reads every file in `data/fo_records/` and `data/fo_reports/`, plus the taxonomy and the call types. `web/vite.config.ts` calls it when the site is built and bundles the result. The site stays static.
- A file the site cannot use is skipped with a warning that names the file and the problem. The build always succeeds.
- Not relevant records are left out of the bundle. So are `status_rationale`, `source` and `date_last_checked`, which the site never shows.
- `web/src/lib/` holds the logic as small pure modules: `match.ts` (score), `filters.ts` (budget and timing), `format.ts` (amounts and dates), `report.ts` (report to screen).

## 2. Specification changes I made

None. `SA_agent.md`, `RE_agent.md`, the five templates, the taxonomy, the call types, the sources, the projects and the data files are byte-for-byte the attached files. The only difference is a file name: the package called the SA instructions `SA_agent (9).md`, and it is saved as `SA_agent.md`.

The gate is not copied. `check-data` reads its code block from `SA_agent.md` each time it runs and passes it to `python3`, from the repository root.

## 3. Suggestions I did not apply

**SA_agent.md**

1. *Known Calls script and broken files.* The Task 1 script stops with an error if any file in `data/fo_records/` is not valid JSON. One broken file then blocks every SA run. A `try`/`except` that names the file and continues would fix it.
2. *`executive_summary` is shown on the site, but has no reader-facing rules.* RE_agent.md section 8 bans internal terms and sets date and money formats for reports; the SA field rule for the summary does not. The attached BMKB summary contains ISO dates ("2027-07-01"). Point the summary to the same rules.
3. *Fallback dates look like published dates.* The site shows the project window from the two project dates. When they are fallbacks (1 January of `call_year`, or 3 years), the card cannot say so, because only `status_rationale` records it. A field such as `project_dates_are_fallback` would let the site say "estimated".
4. *`call_year` type.* The field rules say a number without quotes; the gate also accepts text such as `"2026"`. Pick one.
5. *The templates row in ground rule 1* lists three templates. The folder holds five (the two report templates belong to the RE agent). Harmless, but the row could say so.

**Filter rules and match score**

6. *A single maximum hides smaller projects.* The rule "Hidden if B2 < P" treats a single value as the size the call expects. SA_agent.md says a single limit is a maximum ("up to 60M"). A EUR 2 million project is then hidden for an "up to EUR 60 million" call. I implemented the rule as written. Treating a lone maximum as a cap (Fits when B1 ≤ P, with the "stays at or below" note when B2 > P) would match the SA field rule.
7. *Type 3 records can never score above 75%* when the user answers all four questions, because their `role` list is always empty. Leaving Role out of the average for these records would fix it.
8. *`display_title` already ends with the programme*, and the card also shows the programme above it. Dropping one of the two would make the card calmer.

**RE_agent.md and reports**

9. *Sources and answers.* RE_agent.md says `sources` is null when the answer is null, and filled when it is not. `check-data` does not test this, because the prompt listed only the template check. It is a three-line addition.

**Developer report**

10. Section 8.2 still mentions an "applies to all" value; the FO record has none (dropped in the code, as instructed).
11. Section 8 should state the points in section 5 below once you agree with them: the open filter cases, the call-type wording and the end-range span.
12. If section 8 still lists "Possible funding" on the card, as the old site did: the FO record has no such field, so it is off the card.

## 4. Conflicts between the attached files, and how I read each one

| # | Conflict | How I read it |
| --- | --- | --- |
| 1 | The two attached records have `null` project dates. SA_agent.md and the gate say these are always filled. | Agent files win: the records are wrong, not the rule. Files placed unchanged; `check-data` fails them; the site shows them with no timing filter and a build warning. |
| 2 | Record `20261115-130249-01` (BMKB-Groen) is a loan guarantee ("repayable finance, not a grant") with `call_year` 2022. SA_agent.md Task 2 rule 5 and Task 4 step 1.7 say such a call gets no record. | A data problem for the SA agent. Not changed; the gate does not test it. |
| 3 | The prompt names the developer report as attached. The package does not contain it. | Built from the prompt's description of sections 8.1 and 8.2. |
| 4 | Section 8.2 mentions "applies to all"; the FO record has no such convention. | Dropped, as the prompt says. |
| 5 | "A single limit is always the maximum" (SA) against "Hidden if B2 < P" (filter rules). | Filter rules implemented as written; see suggestion 6. |
| 6 | "Render every field from the FO record" on the card, against "no internal terms on screen". | The card shows the listed fields. `status_rationale`, `source`, `id`, the codes and `date_last_checked` are not shown anywhere. |

## 5. Readings and choices

**Open filter cases** (as the prompt proposed, all covered by unit tests)

- Quarters become dates by the best case: S1 and E1 are the first day of their first quarter; S2 and E2 the last day of their last quarter.
- Dates in notes are month and year ("Feb 2027"); amounts follow RE_agent.md ("EUR 5 million", "EUR 250,000").
- Only the minimum filled: Hidden if B2 < CMin, otherwise Fits, with the minimum note if B1 < CMin.
- Neither size filled: no budget filter.
- The top of the budget slider means no upper limit for B2.

**Further readings I had to make**

- *No end range.* The start note ("Fits if you start in … or later") still appears when S1 < CS.
- *Partly timing.* The card shows only the warning, not the start note as well; "Fits if…" next to "Only work until…" would contradict each other.
- *Single maximum.* The rules list no note for this case, so a Fits card shows none.
- *Null project date* (a record that fails the gate): that side sets no limit. With both null there is no timing filter.
- *Both warnings* can appear on one card, timing first.
- *Deadline passed.* When the record has at least one deadline and all are before today (the browser's date), the card says "The submission deadline has passed". The card is not hidden.
- *Hidden cards are counted.* Under the list the site says how many matching opportunities are not shown because of budget or timing. If all are hidden, the empty state says so.
- *Amounts.* From EUR 1 billion the site writes "EUR 1.5 billion". A range shares one unit when it reads well ("EUR 0.5–3 million", "EUR 50,000–250,000"), otherwise "EUR 50,000 – EUR 3 million". The budget slider boxes use the same format.
- *Card texts when a value is missing:* "Not published" for size and window, "No deadline published" for deadlines. One limit reads "Up to EUR 5 million" or "At least EUR 2 million".

**The filter rules as built** (`web/src/lib/filters.ts`)

Timing. User: start range S1–S2, optional end range E1–E2. Call: CS = `earliest_project_start_date`, CE = `project_end_date`.

- Hidden if S2 < CS or S1 > CE.
- Fits if S2 ≥ CS and E1 ≤ CE. Note "Fits if you start in [CS] or later" if S1 < CS. Note "Fits if you finish by [CE]" if E2 > CE.
- Partly otherwise. Warning: "Only work until [CE] is funded."
- No end range: only the start is checked.

Budget. User: B1–B2. Call: CMin = `minimum_project_size`, CMax = `maximum_project_size`.

- Both filled: Hidden if B2 < CMin. Partly if B1 > CMax, with the warning "This call can fund part of your project (up to [CMax])." Otherwise Fits, with the note "Fits if the project is at least [CMin]" if B1 < CMin and "Fits if the project stays at or below [CMax]" if B2 > CMax.
- Only the maximum P: Hidden if B2 < P. Fits if B1 ≤ P ≤ B2. Partly if B1 > P, with the same warning.

A card is hidden if either status is Hidden. Neither filter changes the score.

**Call-type wording** (the labels Type 1, 2, 3 are never shown)

| Call type | On screen |
| --- | --- |
| Type 1 | TenneT can receive funding |
| Type 2 | TenneT can take part without receiving funding |
| Type 3 | TenneT cannot take part, but could benefit through others |

It appears next to the programme on the card and as a chip on the detail page. The detail page also shows the `value` of each category from `call_types.json` ("Funded consortium partner"), never the code.

**Q6 end range**

- A switch under the start slider, "Also say when the project could end (optional)", adds a second slider.
- Start slider: the current year and the four after it, in quarters (2026–2030 today), as before but no longer hardcoded.
- End slider: the current year and the nine after it, in quarters (2026–2035 today). Calls allow up to about six years, and the start can lie four years ahead.
- The earliest end cannot be before the earliest start: the end slider stops there, and moving the start pushes the end along.
- When switched on, it starts at one to three years after the latest start.

**Other choices**

- *InterOPERA example.* Still hardcoded, but as codes (T4, T7; R2, R8; A4, A6, A7, A8, A13; O7, O4). Labels come from the taxonomy; a code that no longer exists is left out. The old example also listed "System Integration", which the taxonomy no longer has.
- *Labels are shown as written.* The old site capitalised outcome labels; that is gone, so a changed `value` appears exactly.
- *Share* copies a link that opens the opportunity directly. The link ends in `#opportunity=<id>`: the ID is in the address, never in the page.
- *Detail page.* `funding_timing_submission` is on the left; every other block is on the right, in file order. So a new block in a template appears without a code change. The Article View is kept and built from the same data.
- *Report without answers.* A report whose cards are all null is treated like a missing report.
- *Unsafe links.* A record whose `url` does not start with `http://` or `https://` is skipped, because Apply opens it.
- *`check-data` exit code.* It fails on any gate `FAIL`, report `FAIL` or site warning.

## 6. Vercel settings

Nothing has to change. `vercel.json` now tells Vercel everything, and settings in that file take precedence over the project settings:

| Setting | Value in `vercel.json` |
| --- | --- |
| Install command | `npm ci --prefix web` |
| Build command | `npm run build --prefix web` |
| Output directory | `web/dist` |
| Framework preset | none (`framework: null`) |

To confirm, step by step:

1. Open https://vercel.com, choose the project **funding-opportunities-tool**, then **Settings**.
2. Open **Build and Deployment** (older layout: **General**).
3. **Root Directory** must be empty. Do not set it to `web`: the build reads `data/` and `resources/` from the repository root.
4. Under **Framework Settings**, the preset should read **Other**. If the override switches next to Build Command, Output Directory or Install Command are on, you may switch them off; `vercel.json` wins either way.
5. **Node.js Version** should be **22.x** or **24.x**.
6. Before merging, open the pull request on GitHub. Vercel adds a comment with a **Preview** link; open it and check the site. After merging to `main`, the live site updates by itself.
7. To read build warnings: project → **Deployments** → the newest deployment → **Build Logs**, and search for `funding-data`.

## 7. What I removed

- **Old data:** `data/funding-opportunities.json` (11 records) and the three CM2026-01 brief files.
- **Hardcoded content in the code:** the amounts and dates table, the taxonomy lists and definitions, the CM2026-01 source references, the Markdown brief parser.
- **Vinext / Cloudflare Worker build:** `vite.config.ts` (old), `worker/`, `build/sites-vite-plugin.ts`, `next.config.ts`, `app/layout.tsx`, `app/chatgpt-auth.ts`, `.openai/`.
- **Drizzle scaffold:** `db/`, `drizzle/`, `drizzle.config.ts`, `examples/d1/`.
- **Sites scripts and export files:** `scripts/`, `handoff/`, `.env.example`, `.npmrc`, `eslint.config.mjs`, `components.json`, the old tests. (`diagnostics/` was already git-ignored and not in the repository.)
- **Unused UI:** 57 of 61 components in `components/ui/` (button, sheet, slider and tooltip remain), `hooks/`, five unused images.
- **Dependencies:** 17 of 24 runtime packages (among them `next`, `drizzle-orm`, `recharts`, `react-hook-form`, `zod`) and 8 development packages (among them `vinext`, `wrangler`, `eslint`).
- **Build paths:** one remains, `npm run build` in `web/`, which Vercel runs.

## 8. What I tested, and what I could not

**Tested** (41 unit tests, plus the built site in a headless browser)

- The gate runs unchanged from the repository root; `check-data` prints `PASS` for fake records that pass it and `FAIL` with the gate's own messages for records that do not.
- The build succeeds from a clean clone with the Vercel commands, with `data/` empty (clear empty state) and with data.
- Adding a fake record, its report and its source file, then rebuilding, showed the opportunity in the results and the detail page. Removing them removed it. Changing a `value` in the taxonomy changed the label in the questionnaire. No code changed. All fake files were removed afterwards.
- A Not relevant record never appeared. The Type 3 report showed the short layout, Types 1 and 2 the full one; `funding_timing_submission` on the left, the other block on the right.
- A Hidden status hid the card; both Partly warnings appeared exactly as written; the scores were the same with and without filters.
- A broken JSON file in `data/` gave a build warning naming it, the build succeeded, and `check-data` reported the same file.
- Answers render with their bullets and line breaks and no added markup. No internal term appeared on the detail pages.
- Share copied a link that opened the same opportunity.

**Not tested**

- A real Vercel deployment: I did not deploy. The pull request's preview link is the first real run.
- The agents running in the new layout. I checked that every path exists and ran the gate and the Known Calls script from the root, but did not run an SA or RE agent.
- Sections 8.1, 8.2 and 10.5 of the developer report, which I did not have.
- Browsers other than Chromium, and the Share fallback when the clipboard is blocked.
- Windows. `check-data` needs `python3` on the PATH; on Windows the command may be `python`.

## 9. Report format change (16 November 2026)

- `templates/fo_report_type_1_2.template.json`, `templates/fo_report_type_3.template.json` and `RE_agent.md` were replaced by the new versions. Sections 2, 3 and 4 above describe the state before this change; where they cite a section of `RE_agent.md`, the number is the old one (the money and date formats are now in section 6).
- The detail page needed no change to its layout code: it already takes every section and card title and question from the report file. A test now checks this against both templates.
- The two reports in `data/fo_reports/` were moved to the new structure by hand, from their existing answers only. The calls were not read again, so every card the old format had no answer for is null and hidden. Re-run the RE agent on both to fill them.
- There was no CM2026-01 brief or other demo data left to update: it was removed in the restructure (section 7).

## 10. Call-type tags and filter (16 November 2026)

### What changed

- **Agent files.** `resources/call_types.json` and `SA_agent.md` were replaced by the new versions. Against the old files, `call_types.json` gains the `types` list and a `tag` on every category, and nothing else; `SA_agent.md` differs in the one `call_types.json` row of its ground-rules table. The gate is still read from `SA_agent.md` and run from the repository root, unchanged.
- **Loading.** `web/build/load-data.mjs` now reads `types` and the three category lists and bundles, per call type, its tag and its categories with their tags. A type or category without a tag is left out and reported.
- **Tags.** `web/build/call-type-tags.mjs` holds `tagsFor(record, callTypes)`: the type's tag, one category tag per code in the order of `category_codes`, and the codes it could not resolve. The build and the site both use it. A code that is not a category of the record's own type gives a build warning naming the file and the code; the card shows no tag for it.
- **Result card.** The programme stays above the title; the type tag and the category tags sit under the title as small labels that wrap. The old text after the programme ("TenneT can receive funding" and so on) is gone.
- **Filter.** `web/src/lib/call-type-filter.ts` (pure functions) and `web/src/components/call-type-filter.tsx`. It sits below "Selected profile" in a panel with the same look, with "Showing X of Y" and "Clear filters" above the cards, and its own empty state. It is separate from `filters.ts` and runs after `buildResults`, on the finished list.
- **Hard-coded wording removed.** `web/src/lib/wording.ts` is deleted. The table "Call-type wording" in section 5 above no longer applies.
- **`check-data`.** A new part, "Call types", fails on a type or category without a tag, a category tag that contains a category code, a code under more than one type, and a type missing from `types`. A record whose category code the site could not load gives a `WARNING` that is not counted as a problem.
- **Tests.** 18 new unit tests (61 in all): tags, filter, counts, unchanged ranking, and the `check-data` rules.

### Edit profile

The filter is **cleared** on Edit profile, as on Reset and Start over. This was the simpler choice: the filter's state lives in the results screen, which closes in all three cases, so there is no extra reset code. It also means a changed profile never comes back to "Showing 0 of N" because of an old tick.

### How the options are counted

- The counts are taken over the cards left after the match score (at least one shared value) and the budget and timing filters, and before the call-type filter. A card hidden by budget or timing is not counted. Ticking boxes does not move the numbers.
- A category's count is the number of those cards that hold its code.
- A heading's count is the number of those cards that hold at least one category of the group. A record with two codes of one type counts once for the heading and once for each of its two categories, so the category counts can add up to more than the heading.
- "Showing X of Y": Y is the same set of cards, X the ones that pass the call-type filter.
- An option with a count of 0 stays visible, greyed, and can still be ticked.

### Readings and choices

- **Detail page.** Its header showed the old hard-coded call-type wording and the category `value`. Because the only call-type wording on screen may be the tag text, it now shows the same tags as the card. The category `value` is no longer shown anywhere on the site.
- **Definitions.** The `definition` of a type or category appears as a hover text on its tag and on its filter option. It comes from the file unchanged.
- **Filter panel.** Open on wide screens, closed on narrow ones, where its 15 options would push the cards far down. The summary line shows how many options are ticked.
- **A type without a tag** is left out of the filter, and its cards show no tags. A **category without a tag** gets no filter option and no tag.
- **"No stray terms"** was checked on what a user can see or hover (the page text and the `title` and `aria-label` texts), not on the JavaScript file. The bundled data must hold the category and taxonomy codes and `Type 1`, because the filter, the score and `tagsFor` work on them.

### Tested

- Unit tests: the three tag cases of the acceptance criteria against the real `call_types.json`; nothing selected, one category, two codes, the heading, the partly ticked state, the counts and the empty state; the same scores and order with the filter on and off; a hidden card never counted and a Partly card keeping its warning; a changed tag reaching the site without a code change; a missing code warned about by name while the site still loads; `check-data` failing on each of its four rules.
- In a headless browser, with five temporary fake records next to the two real ones (removed afterwards): the exact tag texts on the cards, the filter's headings, labels and counts, one category, a heading, the partly ticked state, the empty state and both "Clear filters" buttons, the filter cleared after Edit profile, the same tags on the detail page, no stray term on the results or detail page, and no sideways scrolling at 390 pixels wide.

### Not tested

- A real Vercel deployment; the pull request's preview is the first real run.
- Browsers other than Chromium, and a screen reader on the partly ticked heading.
- The agents running with the new files. Only the gate was run.

### Suggestions I did not apply

1. *The Type 3 category tags are long and repeat their type tag.* Each starts with "TenneT cannot receive funding, nor take part, but may benefit from …", directly under a type tag that says the same. On a card and in the filter this is the heaviest text. A shorter category tag ("May benefit from flexibility and demand that ease congestion") would read better; it is a wording change in `call_types.json` only.
2. *"Call Type 1:" in the type tags* is the one place where an internal label reaches the screen. Dropping the prefix from the three tags would remove it.
3. *`check-data` counts the null project dates of the two real records as problems*, so it still ends with a failure on this repository, as before.
4. *The filter is not in the link that Share copies.* A shared link opens the opportunity, not the filtered list. That matches "stores nothing outside the browser".

