import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "funding scripts with spaces "));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "scripts"));
  for (const name of ["build-verified.sh", "install-ci.sh", "sites-env.sh"]) {
    const target = path.join(root, "scripts", name);
    await copyFile(path.join(projectRoot, "scripts", name), target);
    // Match checkouts/deployment uploads that do not preserve executable bits.
    await chmod(target, 0o644);
  }
  const env = { ...process.env };
  delete env.SITES_ENV_READY;
  delete env.SITES_PROJECT_ROOT;
  delete env.SITES_RUNTIME_ROOT;
  return { root, env };
}

function run(root, env, script, ...args) {
  return spawnSync("bash", [path.join(root, "scripts", script), ...args], {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 15_000,
  });
}

test("build bootstraps non-executable scripts in paths with spaces and preserves the build status", async (t) => {
  const { root, env } = await fixture(t);
  const bin = path.join(root, "node_modules", ".bin");
  await mkdir(bin, { recursive: true });
  const vinext = path.join(bin, "vinext");
  await writeFile(vinext, `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$SITES_PROJECT_ROOT" "$SITES_ENV_READY" "$@" > "$SITES_PROJECT_ROOT/build-marker"
exit "\${TEST_BUILD_EXIT_CODE:-0}"
`);
  await chmod(vinext, 0o755);

  const success = run(root, env, "build-verified.sh");
  assert.equal(success.status, 0, success.stderr);
  assert.equal(await readFile(path.join(root, "build-marker"), "utf8"), `${root}\n1\nbuild\n`);

  // The bootstrap changes into the project root, so re-entry must also work
  // when the original script was reached through a relative path from outside.
  const outside = spawnSync("bash", [path.relative(path.dirname(root), path.join(root, "scripts", "build-verified.sh"))], {
    cwd: path.dirname(root),
    env,
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.equal(outside.status, 0, outside.stderr);

  const failure = run(root, { ...env, TEST_BUILD_EXIT_CODE: "42" }, "build-verified.sh");
  assert.equal(failure.status, 42, failure.stderr);
});

test("install bootstraps non-executable scripts and reaches its concurrent-install guard", async (t) => {
  const { root, env } = await fixture(t);
  const bin = path.join(root, "test-bin");
  await mkdir(bin);
  // Only the cache query and lock attempt run. No package installation or
  // network access is needed to exercise the install script's bootstrap.
  await writeFile(path.join(bin, "npm"), `#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == "config get cache" ]]
printf '%s\\n' "$npm_config_cache"
`);
  await writeFile(path.join(bin, "flock"), "#!/usr/bin/env bash\nexit 1\n");
  await chmod(path.join(bin, "npm"), 0o755);
  await chmod(path.join(bin, "flock"), 0o755);

  const result = run(root, { ...env, PATH: `${bin}${path.delimiter}${env.PATH}` }, "install-ci.sh");
  assert.equal(result.status, 75, result.stderr);
  assert.match(result.stdout, /\[sites\] environment passed:/);
  assert.match(result.stderr, /Another dependency install is already running/);
  assert.doesNotMatch(result.stderr, /Permission denied/);

  const outside = spawnSync("bash", [path.relative(path.dirname(root), path.join(root, "scripts", "install-ci.sh"))], {
    cwd: path.dirname(root),
    env: { ...env, PATH: `${bin}${path.delimiter}${env.PATH}` },
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.equal(outside.status, 75, outside.stderr);
});

test("environment wrapper preserves command arguments, working directory, and exit status", async (t) => {
  const { root, env } = await fixture(t);
  const args = ["two words", "", "literal $() and ;"];
  const result = run(root, env, "sites-env.sh", "--", process.execPath, "-e",
    "require('node:fs').writeSync(1,JSON.stringify({args:process.argv.slice(1),cwd:process.cwd(),ready:process.env.SITES_ENV_READY}));process.exitCode=23",
    ...args);

  assert.equal(result.status, 23, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { args, cwd: root, ready: "1" });
});
