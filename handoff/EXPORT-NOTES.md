# Export notes

## Identity and revision

- Original Site: **Funding Opportunities Tool**, currently titled **Innovation Funding Desk**.
- Site project ID: `appgprj_6aaceebe9c7481919f12d61b8f91c426`.
- Published URL: <https://funding-opportunities-tool.mengual08.chatgpt.site>.
- Exported source commit: **`f8be253a8abf8a68bc5a8fda46993e25cc2eedde`**.
- Sites saved version: **31**. Its deployment reports `succeeded` at the current Site URL, and its saved source SHA equals the exported Git commit. Exact version/deployment identifiers are in `SOURCE-PROVENANCE.json`.
- Source extraction: `git archive --format=tar` of that immutable local Git commit, not screenshots or regenerated code. All **111 original tracked files** were accessible. The local checkout was clean at inspection; no uncommitted changes were selected. No fetch of a newer source branch was needed to export this published revision.

The original Funding Opportunity Explorer was not selected or accessed for export. The actual application and live Site were not modified, pushed or redeployed. No GitHub repository was created.

## Packaging adjustments and additions

The ZIP contains one root, **`funding-opportunities-tool/`**, retaining the source's folder structure. All runtime application files, components, data, local assets, manifests/lockfile, scripts, tests and Sites configuration are byte-identical to the selected revision. The only original paths with export-only changes are:

| Path | Export-only adjustment | Original retained at |
| --- | --- | --- |
| `README.md` | Replaced generic starter instructions with the inspected project handoff README. | `handoff/original/README.md` |
| `.gitignore` | Appended diagnostic-log/cache/credential exclusions and allowed safe `.env.example`. Existing rules preserved. | `handoff/original/gitignore.txt` |

New files, clearly separate from original application code:

- `.env.example`: commented optional configuration, no application secrets.
- `handoff/SOURCE-PROVENANCE.json`: selected Site, source revision and publication confirmation; no access token or user allowlist.
- `handoff/SOURCE-MANIFEST.json`: paths, sizes and SHA-256 hashes of all 111 original tracked files before handoff edits.
- `handoff/EXTERNAL-REQUIREMENTS.md`: external assets/services and inactive scaffold boundaries.
- `handoff/VERIFICATION.md`: executed commands, failures and limits.
- `handoff/EXPORT-NOTES.md`: this document.
- `handoff/FILE-INVENTORY.csv`: complete packaged-file inventory, origin and SHA-256 hashes. Its own row omits size/hash to avoid self-reference.
- `handoff/check-http-startup.py`: optional HTTP-only verification script; not imported by the application.
- `handoff/original/README.md` and `handoff/original/gitignore.txt`: exact original documents.
- `diagnostics/`: real current install/build/test/startup logs, results, runtime details and package-check record. Included in the ZIP, ignored when committing to GitHub.

No application behavior, matching rule, stored record, dependency version, dependency lockfile, Site identity or runtime configuration was changed. The existing mismatch between the old starter name in lockfile metadata and the renamed package in `package.json` was left intact; the clean locked install succeeded.

## Exclusions and unavailable items

Excluded: `.git/` and its authentication/history/configuration files; credentials and real environment files; `node_modules/`; npm/Vite/Wrangler caches and state; `.sites-runtime/`, `.wrangler/`, `dist/`, `.next/`, `out/`, TypeScript incremental output; unrelated workspace attachments, screenshots, older export/build archives and authoring helpers. No existing secret-bearing file was identified among the 111 tracked files. Only the explicitly documented new diagnostic logs are included, and their output was sanitized. No standalone application LICENSE file existed in the source revision; none was invented. Existing font and vendored-CSS license files are retained.

Unavailable or external: installed npm package bytes, system fonts such as Abadi, the CM2026-01 source PDF, funding-provider websites, platform-managed access controls/identity dispatch, and optional real Cloudflare service bindings. See `EXTERNAL-REQUIREMENTS.md`. These are not replaced with placeholders. The unused legacy brief JSON, starter assets, database scaffold, example API, and original test files are retained for source completeness.

## Practical handoff limits

The exported source installs, builds and starts locally on the verified Linux/Node environment. No missing Sites-only build helper blocked those commands. Two existing tests fail as documented; the suite is not fully green. The source retains a Cloudflare/Vinext build target and original Site metadata. A target deployment platform has not been configured, imported or tested. Sites owner-only access is not application authentication and will not accompany the code to another host. The current UI needs no active database/API integration; future backend architecture is outside this export.

Extract this root into the intended GitHub working directory and review the README. Keep `package-lock.json` and the Sites configuration for provenance. `diagnostics/` is deliberately ignored so local logs are not added by a normal `git add .`; keep the ZIP copy when you need the verification evidence.
