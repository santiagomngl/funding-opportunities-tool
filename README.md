# Innovation Funding Desk — source export

This is the existing **Funding Opportunities Tool** Site, now branded Innovation Funding Desk. Exported on **28 October 2026** from published Sites **version 31**, commit **`f8be253a8abf8a68bc5a8fda46993e25cc2eedde`**. The Site URL is <https://funding-opportunities-tool.mengual08.chatgpt.site>.

Application source, assets, dependency declarations and lockfile are preserved. This README and `handoff/` documentation were added for the export. The original starter README is retained at [handoff/original/README.md](handoff/original/README.md). No Site edit, source push, repository creation or deployment was performed.

## Stack and layout

TypeScript, React **19.2.6**, Next-compatible App Router modules running through **Vinext 0.0.50 / Vite 8.0.13**, Tailwind CSS **4.2.1**, Radix/shadcn UI components and Lucide icons. `next` **16.2.6** is installed, but the actual commands use Vite/Vinext, **not `next build` or `next start`**.

| Location | Purpose |
| --- | --- |
| `app/page.tsx` | Client-side questionnaire, taxonomy, matching, results, detail cards and funding facts. |
| `app/layout.tsx`, `app/globals.css` | HTML metadata, layout, fonts and styling. |
| `components/`, `hooks/`, `lib/` | UI catalog, article view, article/reference transformations and helpers. |
| `data/` | Funding records and CM2026-01 brief files; see data notes below. |
| `public/`, `vendor/` | Local images, SVGs, Montserrat fonts, vendored CSS and included licenses. |
| `vite.config.ts`, `worker/index.ts`, `build/sites-vite-plugin.ts` | Vinext/Cloudflare setup, Worker entry and Sites metadata packaging. |
| `.openai/hosting.json` | Original Site identity; D1 and R2 are both `null`. |
| `scripts/`, `tests/` | Original Linux install/build wrappers and existing tests. |
| `db/`, `drizzle/`, `examples/d1/` | Unused database scaffold and an opt-in example, not a running backend. |
| `handoff/`, `diagnostics/` | Export documentation, inventory, optional HTTP-check script and actual verification logs. |

## Install and run

Use **Linux** (or a suitable Linux/WSL environment), Node.js **`>=22.13.0`**, npm, Bash, `flock`, GNU `timeout`, `curl` and `sha256sum`. Verified here on Linux x86_64 with **Node 24.22.1 and npm 11.9.0**. No exact npm version is declared by the original project. `package-lock.json` uses lockfile version 3 and must be kept unchanged; do not replace it with a newly resolved dependency set.

Run from this project root:

```sh
npm run install:ci
npm run dev -- --host 127.0.0.1 --port 4401 --strictPort
```

Open <http://127.0.0.1:4401>. Stop development mode before starting another process on the same port. The install script runs a bounded `npm ci`, verifies the locked Vinext tarball, and needs package-registry access. Package tarballs, installed dependencies and caches are not in this ZIP.

For the production application:

```sh
npm run build
npm run start -- --port 4400 --hostname 127.0.0.1
```

Open <http://127.0.0.1:4400>. These commands were exercised against the exported source. Build output is generated in `dist/`; the ZIP intentionally excludes it. Production `start` serves the generated server and client assets through Vinext's Node HTTP server. Without flags, `start` uses `PORT` or 3000 and binds to `0.0.0.0`; plain `npm run dev` uses Vite defaults/configuration.

## Data and matching

`app/page.tsx` imports `data/funding-opportunities.json` at build time: **11 records, 5 marked `provided` and 6 `prototype`**. It also imports the two CM2026-01 Markdown files using Vite's `?raw` loader. Taxonomy options/definitions, example projects, financial/timing display facts and PDF page-reference maps are constants in `app/page.tsx`. The older `data/cm2026-01-operational-brief.json` is retained but is not imported by the current app.

Matching runs in the browser in `matchOpportunity`: for each selected taxonomy dimension it measures the fraction of selected values present in that opportunity, then averages across nonempty dimensions. `[All]` is a wildcard. Results with no overlaps are excluded; ties use matched count, provided-record priority, then title. Internal `field` remains the data key displayed as Topic. **Budget and timing selections do not affect ranking.** Data is bundled rather than fetched from an API or database. Financial/timing display data includes demo values; it is not a live funding feed.

Selections, open opportunity and view state live in React memory and reset on reload. The active app does not persist them in localStorage/sessionStorage or a server. The unused UI-sidebar component has cookie support. Apply opens an existing external source URL; Share uses the current page URL, not an opportunity-specific route. Sharing, copying and fullscreen depend on browser support/permissions; clipboard features normally require HTTPS or localhost.

## Configuration and Sites dependencies

**No application API key or required application environment variable was found.** `.env.example` contains only optional settings. The original scripts create ignored `.sites-runtime/` and `.wrangler/` state. Timeout overrides are shell environment settings; copying a dotenv file does not make Bash automatically load them.

The original `.openai/hosting.json`, Vite `sites()` plugin and Cloudflare plugin remain intact. Builds emit a Cloudflare Worker, client assets, generated Wrangler configuration and copied Sites metadata. There is no source `wrangler.jsonc`. D1/R2 are not configured or used by the active app. The Worker retains an image-optimization route that expects Cloudflare `ASSETS`/`IMAGES` bindings; current UI assets do not use that route. Database and ChatGPT-auth helpers are uncalled scaffold. Sites access restrictions and its optional identity/sign-in dispatch are hosting services, **not authentication implemented by this application**; those restrictions do not travel with a ZIP or a Node server.

The cited `CETP_Joint-Call-2026-CallText_FINAL_v20260719.pdf` is **not included** or fetched by the app. Existing page/section references are preserved as authored, not revalidated against that PDF. Funding-provider/PDF links require their external websites when clicked. Montserrat files are local; Abadi is a system-font preference, not a bundled font. No required external build-helper file was found: the original wrappers and local Sites Vite plugin are included.

See [handoff/EXTERNAL-REQUIREMENTS.md](handoff/EXTERNAL-REQUIREMENTS.md) for dependency boundaries. Local Node startup is verified; import/deployment on any other hosting platform, Cloudflare binding provisioning, browser interactions and production access controls have **not** been verified or adapted.

## Verification and repository handoff

Installation, build, and production/development HTTP startup checks passed. The unchanged existing test suite returned **8 passed, 2 failed**; see [handoff/VERIFICATION.md](handoff/VERIFICATION.md) for exact commands, failure causes and limits. `npm test` is the original build-plus-test shortcut and is expected to encounter those failures. `lint` and `db:generate` are retained but were not run.

Extract the ZIP, use this directory as the GitHub repository root, and inspect [handoff/EXPORT-NOTES.md](handoff/EXPORT-NOTES.md) and [handoff/FILE-INVENTORY.csv](handoff/FILE-INVENTORY.csv). Diagnostic logs are intentionally included for review but ignored by Git. Dependencies, caches, secrets, generated output and Git history/authentication files are excluded. No deployment-platform configuration was added and the original Sites configuration was not removed.
