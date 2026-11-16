# Innovation Funding Desk

An internal TenneT prototype. A colleague answers six questions about an innovation project, and the site shows a ranked list of funding opportunities, each with a detail page.

Three parts work together in this repository:

1. **The agent** (SARA: Search, Assessment and Report Agent) finds, assesses and describes funding calls. Its instructions are `AGENT.md`.
2. **The data files** are what the agent writes: one JSON file per call in `data/`.
3. **The web app** in `web/` reads those files when it is built and becomes a static site on Vercel.

There is no server, database, API key or login. Pushing a file to GitHub is the only step needed to update the site.

## What each folder holds, and who writes it

| Path | What it holds | Who writes it |
| --- | --- | --- |
| `AGENT.md` | Instructions for the agent: search, assessment and reports, including the date helper and the gate programme. | Admin |
| `templates/` | The five blank `*.template.json` files the agent copies. | Admin |
| `resources/tennet_taxonomy.json` | The Topic, Role, Activity and Outcome values. The questionnaire shows its `value` and `definition` texts. | Admin |
| `resources/call_types.json` | The categories of each call type, and the texts the site shows for them (see "Call-type tags"). | Admin |
| `resources/sources/` | One file per source the agent searches. | Team members. The agent updates the scan time at the end of a run. |
| `resources/projects/` | One file per TenneT project (the innovation profile). | Team members |
| `data/fo_records/` | One record per funding call, named `<id>.json`. | Agent |
| `data/fo_reports/` | One report per record, with the same file name. | Agent |
| `pdfs/` | PDFs the agent downloads to read. Not committed to Git. | Agent |
| `docs/` | Notes for maintainers. | Admin |
| `web/` | The web app: code, tests and the `check-data` script. | Code (developers) |
| `package.json`, `vercel.json` | Shortcuts for the commands below, and the Vercel build settings. | Code (developers) |

Run the agent from this folder (the repository root), so that the paths in its instructions work as written. Start a run with a message that names the source, for example: "Follow the instructions in AGENT.md for the source: RVO Subsidie- en financieringswijzer". The name must equal the `source_name` of a file in `resources/sources/`.

## One-time setup

You need [Node.js](https://nodejs.org) 22.13 or newer and Python 3. In this folder, run:

```bash
npm run setup
```

## Add a file and see it on the site

1. **Add the file.** Run the agent, or add a file by hand: a record in `data/fo_records/`, a report in `data/fo_reports/`, a source in `resources/sources/` or a project in `resources/projects/`.
2. **Check it.**

   ```bash
   npm run check-data
   ```

   It prints `PASS` or `FAIL` for every record (using the gate programme from `AGENT.md`), every report (compared with its template) and the call-type tags, then the warnings the site build would print. Fix what it lists and run it again.
3. **Push** the files to GitHub. Vercel rebuilds the site in about a minute. A push to `main` updates the live site; a push to another branch gives a preview link.

What the site does with the files:

- A record with call type Not relevant never appears.
- A record without a report appears, and its page says the report has not been written yet.
- A file that is broken or incomplete is left out. The build log on Vercel and `check-data` both name the file and the problem. The rest of the site still works.
- Changing a `value` or `definition` in `resources/tennet_taxonomy.json` changes the text in the questionnaire.

## Call-type tags

Every result card and detail page says, in plain words, how TenneT relates to the call: one tag per category of the record. On the detail page, clicking a tag opens each category's name and definition under the tags.

- **Where the wording lives.** Only in `resources/call_types.json`: the `tag`, `value` and `definition` of each category in `type_1`, `type_2` and `type_3`. The site shows each text exactly as written. FO records hold codes only.
- **How to change it.** Edit the text in `resources/call_types.json`, run `npm run check-data`, and push. No code changes. `check-data` fails when a category has no tag, when a category tag contains a category code, or when a code sits under two types.
- **What the site does not show.** The call type itself (its `tag` and `definition` in `types`), and the `executive_summary` of an FO record. Both stay in the files for the agent.

## Run the site on your computer

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). The page reloads when a file in `data/` or `resources/` changes.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the site into `web/dist/`, exactly as Vercel does. |
| `npm run preview` | Serves the built site locally. |
| `npm test` | Runs the unit tests (filters, match score, data loading, `check-data`). |

## Screens and addresses

The site is one page; the part of the address after `#` says which screen is open, so the browser's Back button, a refresh and a shared link all work.

| Address | Screen |
| --- | --- |
| (nothing) | Landing page |
| `#/questions/<step>?…` | One question (`topic`, `role`, `activity`, `outcome`, `budget`, `timing`) |
| `#/results?…` | The ranked results of a questionnaire |
| `#/browse` | Every opportunity, soonest deadline first, without a score |
| `#/opportunity/<id>` | One opportunity. With `?…` it was opened from results and shows its match. |

`?…` holds the answers: `t`, `r`, `a`, `o` (taxonomy codes, joined by `.`), `b` (budget slider positions), `s` and `e` (start and end quarters, such as `2027Q3-2028Q3`). Links in the earlier format `#opportunity=<id>` still open.

## More

`docs/RESTRUCTURE_NOTES.md` explains how the web app reads the data, the match score, the budget and timing filters, the Vercel settings and the open points.
