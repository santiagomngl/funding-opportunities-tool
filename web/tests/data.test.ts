import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { loadSiteData } from "../build/load-data.mjs";
import { fakeRecord, fakeReport, ids, makeFixtureRoot, writeJson } from "./helpers/fixtures.ts";

const checkData = fileURLToPath(new URL("../scripts/check-data.mjs", import.meta.url));
const roots: string[] = [];
function fixtureRoot() {
  const root = makeFixtureRoot();
  roots.push(root);
  return root;
}
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function runCheck(root: string) {
  const run = spawnSync(process.execPath, [checkData, "--root", root], { encoding: "utf8" });
  return { status: run.status, output: run.stdout + run.stderr };
}

type Loaded = { record: { id: string; call_type: string }; report: Record<string, unknown> | null };
const load = (root: string) => {
  const { data, warnings } = loadSiteData(root);
  return { opportunities: (data as { opportunities: Loaded[] }).opportunities, data, warnings };
};

test("the site gets every usable record, with its report, and never a Not relevant one", () => {
  const { opportunities, warnings } = load(fixtureRoot());
  assert.deepEqual(warnings, []);
  assert.deepEqual(opportunities.map((o) => o.record.id), [ids.funded, ids.forOthers, ids.noReport]);
  assert.deepEqual(Object.keys(opportunities[0].report!), ["project_requirements", "funding_timing_submission"]);
  assert.deepEqual(Object.keys(opportunities[1].report!), ["call_overview", "funding_timing_submission"]);
  assert.equal(opportunities[2].report, null);
  assert.ok(!JSON.stringify(opportunities).includes("rationale"), "internal fields stay out of the bundle");
});

test("the taxonomy file drives the labels", () => {
  const root = fixtureRoot();
  const file = path.join(root, "resources/tennet_taxonomy.json");
  const taxonomy = JSON.parse(JSON.stringify((load(root).data as { taxonomy: unknown }).taxonomy));
  taxonomy.topic[0].value = "FAKE renamed topic";
  writeJson(file, taxonomy);
  const reloaded = load(root).data as { taxonomy: { topic: { value: string }[] } };
  assert.equal(reloaded.taxonomy.topic[0].value, "FAKE renamed topic");
});

test("a broken file is skipped with a warning that names it; the rest still loads", () => {
  const root = fixtureRoot();
  writeFileSync(path.join(root, "data/fo_records/20200101-000000-09.json"), '{ "id": "20200101-000000-09", ');
  writeFileSync(path.join(root, `data/fo_reports/${ids.forOthers}.json`), "not json");
  const incomplete = fakeRecord("20200101-000000-08", "Type 1");
  delete incomplete.taxonomy_values;
  writeJson(path.join(root, "data/fo_records/20200101-000000-08.json"), incomplete);

  const { opportunities, warnings } = load(root);
  assert.deepEqual(opportunities.map((o) => o.record.id), [ids.funded, ids.forOthers, ids.noReport]);
  assert.equal(opportunities[1].report, null);
  assert.deepEqual(warnings.map((w) => w.file), [
    "data/fo_records/20200101-000000-08.json",
    "data/fo_records/20200101-000000-09.json",
    `data/fo_reports/${ids.forOthers}.json`,
  ]);
  assert.match(warnings[0].problem, /missing key\(s\): taxonomy_values/);
  assert.match(warnings[1].problem, /not valid JSON/);

  const check = runCheck(root);
  assert.equal(check.status, 1);
  assert.match(check.output, /FAIL {2}data\/fo_records\/20200101-000000-09\.json/);
  assert.match(check.output, /WARNING data\/fo_records\/20200101-000000-09\.json: not valid JSON/);
  assert.match(check.output, /FAIL {2}data\/fo_reports\/20200101-000000-02\.json/);
});

test("a record with an unsafe link or a wrong call type is skipped", () => {
  const root = fixtureRoot();
  writeJson(path.join(root, "data/fo_records/20200101-000000-07.json"),
    fakeRecord("20200101-000000-07", "Type 1", { url: "javascript:alert(1)" }));
  writeJson(path.join(root, "data/fo_records/20200101-000000-06.json"),
    fakeRecord("20200101-000000-06", "Type 1", { call_type: "Type 4" }));
  const { opportunities, warnings } = load(root);
  assert.equal(opportunities.length, 3);
  assert.equal(warnings.length, 2);
});

test("empty data folders give an empty site, without warnings", () => {
  const root = fixtureRoot();
  rmSync(path.join(root, "data"), { recursive: true });
  const { opportunities, warnings } = load(root);
  assert.deepEqual(opportunities, []);
  assert.deepEqual(warnings, []);
  assert.equal(runCheck(root).status, 0);
});

test("check-data prints PASS for records that pass the gate and reports that follow their template", () => {
  const check = runCheck(fixtureRoot());
  assert.equal(check.status, 0, check.output);
  for (const id of Object.values(ids)) {
    assert.match(check.output, new RegExp(`PASS {2}data/fo_records/${id}\\.json`));
  }
  assert.match(check.output, new RegExp(`PASS {2}data/fo_reports/${ids.funded}\\.json`));
  assert.match(check.output, new RegExp(`PASS {2}data/fo_reports/${ids.forOthers}\\.json`));
  assert.match(check.output, new RegExp(`no report yet for ${ids.noReport}`));
});

test("check-data: the gate rejects a bad record", () => {
  const root = fixtureRoot();
  writeJson(path.join(root, `data/fo_records/${ids.funded}.json`),
    fakeRecord(ids.funded, "Type 1", { earliest_project_start_date: null }));
  const check = runCheck(root);
  assert.equal(check.status, 1);
  assert.match(check.output, /earliest_project_start_date: must be filled in/);
});

test("check-data: a report must be its template, with only answer and sources filled", () => {
  const root = fixtureRoot();
  const file = (id: string) => path.join(root, `data/fo_reports/${id}.json`);
  const sections = (report: Record<string, unknown>, block: string) =>
    report[block] as { title: string; question: string; cards: Record<string, unknown>[] }[];

  const reworded = fakeReport("fo_report_type_1_2.template.json");
  sections(reworded, "project_requirements")[0].question = "A different question?";
  sections(reworded, "funding_timing_submission")[0].cards[0].note = "an extra key";
  sections(reworded, "funding_timing_submission")[1].cards[0].answer = 12;
  writeJson(file(ids.funded), reworded);
  // The full template on a Type 3 record, a report for a Not relevant record, and one without a record.
  writeJson(file(ids.forOthers), fakeReport("fo_report_type_1_2.template.json"));
  writeJson(file(ids.notRelevant), fakeReport("fo_report_type_3.template.json"));
  writeJson(file("20200101-000000-05"), fakeReport("fo_report_type_3.template.json"));

  const { status, output } = runCheck(root);
  assert.equal(status, 1);
  assert.match(output, /project_requirements\[0\]\.question: must stay "What must the project address/);
  assert.match(output, /funding_timing_submission\[0\]\.cards\[0\]: the keys must be exactly the template's/);
  assert.match(output, /funding_timing_submission\[1\]\.cards\[0\]\.answer: must be text or null/);
  assert.match(output, new RegExp(`FAIL {2}data/fo_reports/${ids.forOthers}\\.json\\n\\s+- the report: the keys must be exactly`));
  assert.match(output, /its record has call_type "Not relevant"/);
  assert.match(output, /no record data\/fo_records\/20200101-000000-05\.json/);
});
