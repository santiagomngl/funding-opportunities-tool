# Innovation Funding Desk — source export

This is the existing **Funding Opportunities Tool** Site, now branded Innovation Funding Desk. Exported on **28 October 2026** from published Sites **version 31**, commit **`f8be253a8abf8a68bc5a8fda46993e25cc2eedde`**. The Site URL is <https://funding-opportunities-tool.mengual08.chatgpt.site>.

The original export preserved application source, assets, dependency declarations and lockfile, and added this README and `handoff/` documentation. The repository now also includes a standalone deployment build and fixes for the shell wrappers. The original starter README is retained at [handoff/original/README.md](handoff/original/README.md). No Site edit, source push, repository creation or deployment was performed during the export.

## Deploy on Vercel or Replit

Use the standalone static build for these hosts. It renders the existing application through `index.html` and `standalone/main.tsx`, using `vite.standalone.config.ts`. It needs no application server, API keys, database, Sites service or Cloudflare bindings. JavaScript must be enabled in the browser.

For **Vercel**, import this repository with its root as the project directory and select Node.js **22.x or 24.x**. The included `vercel.json` sets:

| Setting | Value |
| --- | --- |
| Framework preset | Other (`framework: null`) |
| Install command | `npm ci` |
| Build command | `npm run build:standalone` |
| Output directory | `dist/standalone` |

Remove any conflicting project-level overrides, especially a Next.js framework preset or `.next` output directory. `next` remains installed for the original workflow, but this deployment uses Vite. No start command is needed for the static deployment.

For **Replit Static deployments**, use the same build command and set the public directory to `dist/standalone`, after installing dependencies with `npm ci`.

To build and check this path locally from the repository root:

```sh
npm ci
npm run build:standalone
npm run preview:standalone -- --host 127.0.0.1 --port 4402 --strictPort
```

`preview:standalone` is a local build check; deploy the generated files with the host's static deployment service. For development, use `npm run dev:standalone`. Both commands accept `--host 0.0.0.0 --port <port>` when a remote development environment requires them. These additions prepare deployment configuration; they do not establish that a deployment has been published on either service.

## Stack and layout

TypeScript, React **19.2.6**, Next-compatible App Router modules, **Vinext 0.0.50 / Vite 8.0.13**, Tailwind CSS **4.2.1**, Radix/shadcn UI components and Lucide icons. `next` **16.2.6** is installed. The original commands use Vite/Vinext; the standalone commands use Vite and React without a server. Neither path uses `next build` or `next start`.

| Location | Purpose |
| --- | --- |
| `app/page.tsx` | Client-side questionnaire, taxonomy, matching, results, detail cards and funding facts. |
| `app/layout.tsx`, `app/globals.css` | HTML metadata, layout, fonts and styling. |
| `components/`, `hooks/`, `lib/` | UI catalog, article view, article/reference transformations and helpers. |
| `data/` | Funding records and CM2026-01 brief files; see data notes below. |
| `public/`, `vendor/` | Local images, SVGs, Montserrat fonts, vendored CSS and included licenses. |
| `vite.config.ts`, `worker/index.ts`, `build/sites-vite-plugin.ts` | Vinext/Cloudflare setup, Worker entry and Sites metadata packaging. |
| `index.html`, `standalone/main.tsx`, `vite.standalone.config.ts`, `vercel.json` | Static React entry, standalone build and Vercel deployment settings. |
| `.openai/hosting.json` | Original Site identity; D1 and R2 are both `null`. |
| `scripts/`, `tests/` | Linux install/build wrappers and tests. Shell wrappers explicitly invoke Bash rather than relying on executable permissions. |
| `db/`, `drizzle/`, `examples/d1/` | Unused database scaffold and an opt-in example, not a running backend. |
| `handoff/`, `diagnostics/` | Export documentation, inventory, optional HTTP-check script and actual verification logs. |

## Vinext/Sites workflow

The existing `npm run build` and `npm run start` retain the original Vinext workflow. Use **Linux** (or a suitable Linux/WSL environment), Node.js **`>=22.13.0`**, npm, Bash, `flock`, GNU `timeout`, `curl` and `sha256sum`. The original export was verified on Linux x86_64 with **Node 24.22.1 and npm 11.9.0**. No exact npm version is declared by the original project. `package-lock.json` uses lockfile version 3; use `npm ci` to preserve the dependency set.

The build and install wrappers now invoke both their environment bootstrap and their re-entered script through Bash. They work with Git's existing `0644` script modes; deployment does not need a manual `chmod` step.

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

The original `.openai/hosting.json`, Vite `sites()` plugin and Cloudflare plugin remain intact for `npm run build`. That build emits a Cloudflare Worker, client assets, generated Wrangler configuration and copied Sites metadata. The separate standalone build does not load these plugins or use these services. There is no source `wrangler.jsonc`. D1/R2 are not configured or used by the active app. The Worker retains an image-optimization route that expects Cloudflare `ASSETS`/`IMAGES` bindings; current UI assets do not use that route. Database and ChatGPT-auth helpers are uncalled scaffold. Sites access restrictions and its optional identity/sign-in dispatch are hosting services, **not authentication implemented by this application**; those restrictions do not travel with a ZIP, a Node server or a static deployment.

The cited `CETP_Joint-Call-2026-CallText_FINAL_v20260719.pdf` is **not included** or fetched by the app. Existing page/section references are preserved as authored, not revalidated against that PDF. Funding-provider/PDF links require their external websites when clicked. Montserrat files are local; Abadi is a system-font preference, not a bundled font. No required external build-helper file was found: the original wrappers and local Sites Vite plugin are included.

See [handoff/EXTERNAL-REQUIREMENTS.md](handoff/EXTERNAL-REQUIREMENTS.md) for the original export's dependency boundaries. Its verification covered local Node startup. The standalone build and deployment settings were added afterward; actual Vercel/Replit publication, Cloudflare binding provisioning and production access controls are not established by those historical checks.

## Verification and repository handoff

The deployment fixes were checked with Node **24.19.0** and npm **11.9.0**. `npm run install:ci`, `npm run build`, and the standalone build passed. A clean copy without Sites configuration installed the locked dependencies and built successfully; its static output passed Chromium checks at **1440×1000** and **390×844** through all six questions, 11 results, detail cards, article references and reset, with no browser errors or failed asset requests. The three shell regression tests pass with script modes `0644`, including paths with spaces and invocation from outside the project root. The full `npm test` run returned **11 passed, 2 failed**: the same preview-metadata and CSS-utility assertions documented below. Tests run sequentially to prevent competing Vite test listeners. Actual Vercel/Replit publication has not been tested.

During the original export, installation, build, and production/development HTTP startup checks passed. The existing test suite returned **8 passed, 2 failed**; see [handoff/VERIFICATION.md](handoff/VERIFICATION.md) for those historical commands, failure causes and limits. `npm test` is the Vinext build-plus-test shortcut and is expected to encounter those failures. That report does not validate the subsequently added standalone deployment path. `lint` and `db:generate` are retained but were not run in the original export.

For the original ZIP handoff, use this directory as the GitHub repository root and inspect [handoff/EXPORT-NOTES.md](handoff/EXPORT-NOTES.md) and [handoff/FILE-INVENTORY.csv](handoff/FILE-INVENTORY.csv). Those documents and the inventory describe the original export, before the standalone deployment additions. Export diagnostic logs are ignored by Git. Dependencies, caches, secrets, generated output and Git history/authentication files were excluded from the ZIP. The original Sites configuration remains alongside the new Vercel configuration.
