#!/usr/bin/env node
// Checks the agent data files before pushing. Run from anywhere:
//
//   npm run check-data
//
// 1. FO records: runs the gate programme on every file in data/fo_records/.
//    The gate's code is read from SA_agent.md each time, so the rules live in
//    one place. Needs python3, as the agents do.
// 2. FO reports: each file in data/fo_reports/ must be its template with only
//    `answer` and `sources` filled in, and belong to a Type 1, 2 or 3 record.
// 3. Site: prints the warnings the site build would print.
//
// Exits with code 1 when anything fails. Writes nothing.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteData } from "../build/load-data.mjs";

// The folder that holds data/, resources/, templates/ and SA_agent.md.
// `--root <folder>` checks another folder (used by the tests).
const rootFlag = process.argv.indexOf("--root");
const root = path.resolve(
  rootFlag > -1 ? process.argv[rootFlag + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
);

const TEMPLATE_FOR = {
  "Type 1": "templates/fo_report_type_1_2.template.json",
  "Type 2": "templates/fo_report_type_1_2.template.json",
  "Type 3": "templates/fo_report_type_3.template.json",
};

let failures = 0;
const say = (line = "") => console.log(line);
function result(ok, file, problems = []) {
  if (!ok) failures += 1;
  say(`  ${ok ? "PASS" : "FAIL"}  ${file}`);
  problems.forEach((problem) => say(`        - ${problem}`));
}

function jsonFiles(dir) {
  const full = path.join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full).filter((name) => name.endsWith(".json")).sort().map((name) => `${dir}/${name}`);
}

/** The Python code of the gate programme, taken from its code block in SA_agent.md. */
function gateCode() {
  const lines = readFileSync(path.join(root, "SA_agent.md"), "utf8").split(/\r?\n/);
  const heading = lines.findIndex((line) => /^##\s+The gate programme\s*$/.test(line));
  if (heading === -1) throw new Error('SA_agent.md has no "## The gate programme" section');
  const start = lines.findIndex((line, i) => i > heading && /^python3 - .*<<'EOF'\s*$/.test(line));
  const end = lines.findIndex((line, i) => i > start && line.trim() === "EOF");
  if (start === -1 || end === -1) throw new Error("SA_agent.md: cannot find the gate's code block");
  return lines.slice(start + 1, end).join("\n");
}

// --- 1. FO records ------------------------------------------------------------

say("FO records (the gate programme from SA_agent.md)");
const recordFiles = jsonFiles("data/fo_records");
const callTypeOf = new Map();
if (recordFiles.length === 0) say("  none");
else {
  let code = null;
  try {
    code = gateCode();
  } catch (error) {
    failures += 1;
    say(`  FAIL  ${error.message}`);
  }
  for (const file of code === null ? [] : recordFiles) {
    const run = spawnSync("python3", ["-", file], { cwd: root, input: code, encoding: "utf8" });
    if (run.error) {
      failures += 1;
      say(`  FAIL  cannot run python3 (${run.error.message}). Install Python 3 and try again.`);
      break;
    }
    const output = `${run.stdout}${run.stderr}`.trim().split("\n");
    const passed = run.status === 0 && output[0] === "PASS";
    result(passed, file, passed ? [] : output.filter((l) => l !== "FAIL").map((l) => l.replace(/^\s*-\s*/, "")));
  }
  for (const file of recordFiles) {
    try {
      callTypeOf.set(path.basename(file, ".json"), JSON.parse(readFileSync(path.join(root, file), "utf8")).call_type);
    } catch {
      // Reported by the gate above.
    }
  }
}

// --- 2. FO reports ------------------------------------------------------------

/** Lists where `report` differs from `template`, apart from filled answers and sources. */
function compare(template, report, where, problems) {
  const at = where || "the report";
  if (Array.isArray(template)) {
    if (!Array.isArray(report) || report.length !== template.length) {
      problems.push(`${at}: must be a list of ${template.length}, as in the template`);
      return;
    }
    template.forEach((item, i) => compare(item, report[i], `${where}[${i}]`, problems));
  } else if (template !== null && typeof template === "object") {
    const keys = Object.keys(template);
    if (report === null || typeof report !== "object" || Array.isArray(report) ||
        Object.keys(report).join("|") !== keys.join("|")) {
      problems.push(`${at}: the keys must be exactly the template's, in its order: ${keys.join(", ")}`);
      return;
    }
    for (const key of keys) {
      const here = where ? `${where}.${key}` : key;
      if (key === "answer" || key === "sources") {
        const value = report[key];
        if (value !== null && typeof value !== "string") problems.push(`${here}: must be text or null`);
        else if (typeof value === "string" && value.trim() === "") problems.push(`${here}: is empty; use null`);
      } else {
        compare(template[key], report[key], here, problems);
      }
    }
  } else if (report !== template) {
    problems.push(`${at}: must stay ${JSON.stringify(template)}, as in the template`);
  }
}

say();
say("FO reports (against their template)");
const reportFiles = jsonFiles("data/fo_reports");
if (reportFiles.length === 0) say("  none");
for (const file of reportFiles) {
  const id = path.basename(file, ".json");
  const problems = [];
  let report;
  try {
    report = JSON.parse(readFileSync(path.join(root, file), "utf8"));
  } catch (error) {
    result(false, file, [`not valid JSON: ${error.message}`]);
    continue;
  }
  const callType = callTypeOf.get(id);
  const templateFile = TEMPLATE_FOR[callType];
  if (!callTypeOf.has(id)) {
    problems.push(`no record data/fo_records/${id}.json: a report is named after its FO record`);
  } else if (!templateFile) {
    problems.push(`its record has call_type ${JSON.stringify(callType)}; only Type 1, 2 and 3 records get a report`);
  } else {
    try {
      compare(JSON.parse(readFileSync(path.join(root, templateFile), "utf8")), report, "", problems);
    } catch (error) {
      problems.push(`cannot read ${templateFile}: ${error.message}`);
    }
  }
  result(problems.length === 0, file, problems);
}

const withoutReport = [...callTypeOf]
  .filter(([id, type]) => TEMPLATE_FOR[type] && !reportFiles.includes(`data/fo_reports/${id}.json`))
  .map(([id]) => id);
if (withoutReport.length) {
  say(`  Note: no report yet for ${withoutReport.join(", ")} (the site says so on its page).`);
}

// --- 3. What the site build will say -------------------------------------------

say();
say("Site build");
const { warnings, counts } = loadSiteData(root);
warnings.forEach(({ file, problem }) => say(`  WARNING ${file}: ${problem}`));
failures += warnings.length;
say(`  ${counts.shown} funding opportunities will be on the site; ${counts.notRelevant} not relevant left out.`);

say();
say(failures === 0 ? "check-data: all good." : `check-data: ${failures} problem(s) found. Fix them before pushing.`);
process.exit(failures === 0 ? 0 : 1);
