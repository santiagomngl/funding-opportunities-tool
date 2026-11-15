# Innovation Funding Desk

An internal TenneT prototype. A colleague answers six questions about an innovation project, and the site shows a ranked list of funding opportunities, each with a detail page.

Three parts work together in this repository:

1. **The agents** find and describe funding calls. Their instructions are `SA_agent.md` and `RE_agent.md`.
2. **The data files** are what the agents write: one JSON file per call in `data/`.
3. **The web app** in `web/` reads those files when it is built and becomes a static site on Vercel.

There is no server, database, API key or login. Pushing a file to GitHub is the only step needed to update the site.

## What each folder holds, and who writes it

| Path | What it holds | Who writes it |
| --- | --- | --- |
| `SA_agent.md` | Instructions for the SA agent (search and assessment), including the gate programme. | Admin |
| `RE_agent.md` | Instructions for the RE agent (reports). | Admin |
| `templates/` | The five blank `*.template.json` files the agents copy. | Admin |
| `resources/tennet_taxonomy.json` | The Topic, Role, Activity and Outcome values. The questionnaire shows its `value` and `definition` texts. | Admin |
| `resources/call_types.json` | The categories of each call type. | Admin |
| `resources/sources/` | One file per source the SA agent searches. | Team members. The SA agent updates the scan time at the end of a run. |
| `resources/projects/` | One file per TenneT project (the innovation profile). | Team members |
| `data/fo_records/` | One record per funding call, named `<id>.json`. | SA agent |
| `data/fo_reports/` | One report per record, with the same file name. | RE agent |
| `pdfs/` | PDFs the agents download to read. Not committed to Git. | SA agent, RE agent |
| `docs/` | Notes for maintainers. | Admin |
| `web/` | The web app: code, tests and the `check-data` script. | Code (developers) |
| `package.json`, `vercel.json` | Shortcuts for the commands below, and the Vercel build settings. | Code (developers) |

Run the agents from this folder (the repository root), so that the paths in their instructions work as written.

## One-time setup

You need [Node.js](https://nodejs.org) 22.13 or newer and Python 3. In this folder, run:

```bash
npm run setup
```

## Add a file and see it on the site

1. **Add the file.** Run an agent, or add a file by hand: a record in `data/fo_records/`, a report in `data/fo_reports/`, a source in `resources/sources/` or a project in `resources/projects/`.
2. **Check it.**

   ```bash
   npm run check-data
   ```

   It prints `PASS` or `FAIL` for every record (using the gate programme from `SA_agent.md`) and every report (compared with its template), then the warnings the site build would print. Fix what it lists and run it again.
3. **Push** the files to GitHub. Vercel rebuilds the site in about a minute. A push to `main` updates the live site; a push to another branch gives a preview link.

What the site does with the files:

- A record with call type Not relevant never appears.
- A record without a report appears, and its page says the report has not been written yet.
- A file that is broken or incomplete is left out. The build log on Vercel and `check-data` both name the file and the problem. The rest of the site still works.
- Changing a `value` or `definition` in `resources/tennet_taxonomy.json` changes the text in the questionnaire.

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

## More

`docs/RESTRUCTURE_NOTES.md` explains how the web app reads the data, the match score, the budget and timing filters, the Vercel settings and the open points.
