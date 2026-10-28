# Verification performed for this export

These are new checks run on **28 October 2026**, not historical build logs. The source was extracted from Git commit `f8be253a8abf8a68bc5a8fda46993e25cc2eedde` into a separate directory with no installed dependencies or generated build output. Application code and dependency inputs were not changed to obtain these results.

Environment: Linux x86_64, Node **24.22.1**, npm **11.9.0**; required Bash/Linux tools were available. See `../diagnostics/runtime.json` for exact runtime details and `../diagnostics/results.json` for timestamps, exit codes, commands and HTTP checks.

| Command actually executed in the export root | Result | Actual log |
| --- | --- | --- |
| `npm run install:ci` | Exit 0. Locked Vinext tarball integrity preflight passed; bounded `npm ci` installed 677 packages. Existing optional image cache did not match, so the network path was used. | `diagnostics/01-install.log` |
| `npm run build` | Exit 0. All five Vinext build phases completed; Worker/server/client output generated. | `diagnostics/02-build.log` |
| `node --test tests/opportunity-article.test.mjs tests/rendered-html.test.mjs tests/ui-components.test.mjs` | Exit 1: 10 tests, 8 passes, 2 failures. All five article tests and three of four UI catalog tests passed. | `diagnostics/03-tests.log` |
| `npm run start -- --port 4400 --hostname 127.0.0.1` | Started successfully. Local HTTP checks passed, then the server was deliberately stopped. | `diagnostics/04-production-startup.log` |
| `npm run dev -- --host 127.0.0.1 --port 4401 --strictPort` | Started successfully. Local HTTP checks passed, then the server was deliberately stopped. | `diagnostics/05-development-startup.log` |

The optional added `handoff/check-http-startup.py` ran the two server commands above and HTTP probes using Python's standard library. Run `python3 handoff/check-http-startup.py production` after building, or `python3 handoff/check-http-startup.py development`, to repeat these checks on Linux. It writes new diagnostics and stops only the process group it started. Python is a verification convenience, not an application runtime requirement.

Both server checks received HTML HTTP 200 containing the existing landing title and heading. Favicon and both Montserrat files returned exact source bytes. The production page's linked JavaScript/CSS assets, and development entry/CSS module, returned HTTP 200. This verifies HTTP startup and asset delivery, **not browser hydration or every interactive flow**. Server return code `-15` in the diagnostics records intentional SIGTERM cleanup after successful probes, not a startup failure.

## Existing test failures, left unchanged

1. **`renders development preview metadata`**, in `tests/rendered-html.test.mjs`: the test calls the built Worker and confirms HTML status/type, then expects a `codex-preview` meta tag with `development` content. Current `app/layout.tsx` does not emit that tag and the generated HTML does not contain it. The assertion fails; the HTML itself returned successfully.
2. **`emits the catalog's animation and scrolling utilities`**, in `tests/ui-components.test.mjs`: its assertion for `/scrollbar-width:\s*none/` is not met by the current generated CSS. The project explicitly defines `scrollbar-thin`, while the unused catalog's expected `none` utility is not emitted in this build. The test stops at this first failed assertion, so later assertions in that test are not established as passed or failed.

The original `npm test` script builds and then invokes `node --test tests/*.test.mjs`. The same build and all three existing test files were executed above as separate commands to retain a distinct build log without rebuilding twice. `npm test` itself was not run as an additional duplicate command. No failing test was removed, skipped, edited or changed into a success.

## Observed messages and verification limits

- npm emitted a host `http-proxy` configuration warning and two upstream deprecated-package warnings. They did not prevent installation. No dependency update or audit remediation was performed.
- The build emitted Vinext's route-classification message (`? Unknown` for `/`) because of its static-analysis limits. Build completed and both servers served `/` successfully.
- Lint, standalone TypeScript checking, database migrations/generation, cloud deployment, external funding URLs/PDF access, real Cloudflare image bindings, platform identity and access enforcement were not tested.
- No browser automation, visual comparison, clipboard permissions, sharing, fullscreen or full end-to-end questionnaire/card interaction was performed. Source was preserved rather than adapted to a target host.
- Only newly executed verification output is included. Historical server/publishing logs were not requested from the platform, inferred or fabricated.
- Diagnostic capture removed terminal color escapes and checked/redacted credential-like values. Paths and dependency warnings remain to explain the actual environment. No environment dump or source credential was recorded.

Final source-integrity, ignore-rule, ZIP membership, extraction and checksum checks are recorded in `diagnostics/06-package-checks.log`. The inventory lists original files and the specific handoff-only additions separately.
