import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
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
  assert.ok(!JSON.stringify(opportunities).includes("summary"), "the executive summary is never on the site");
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
    fakeRecord(ids.funded, "Type 1", { date_last_checked: null }));
  const check = runCheck(root);
  assert.equal(check.status, 1);
  assert.match(check.output, /date_last_checked: must be filled in/);
});

test("a record without project dates passes the gate and is shown without a warning", () => {
  const root = fixtureRoot();
  writeJson(path.join(root, `data/fo_records/${ids.funded}.json`),
    fakeRecord(ids.funded, "Type 1", { earliest_project_start_date: null, project_end_date: null }));
  assert.deepEqual(load(root).warnings, []);
  assert.equal(runCheck(root).status, 0);
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

// --- Call types ---------------------------------------------------------------

type RawCallTypes = Record<string, { type?: string; code?: string; tag?: string }[]>;
function editCallTypes(root: string, edit: (raw: RawCallTypes) => void) {
  const file = path.join(root, "resources/call_types.json");
  const raw = JSON.parse(readFileSync(file, "utf8"));
  edit(raw);
  writeJson(file, raw);
}
const callTypesOf = (root: string) =>
  (load(root).data as { callTypes: { type: string; tag: string; categories: { code: string; tag: string }[] }[] }).callTypes;

test("changing a tag in call_types.json changes what the site shows, without a code change", () => {
  const root = fixtureRoot();
  editCallTypes(root, (raw) => {
    raw.type_1[0].tag = "FAKE category tag";
  });
  const [type1] = callTypesOf(root);
  assert.equal(type1.categories[0].tag, "FAKE category tag");
  assert.equal(runCheck(root).status, 0);
});

test("a category code missing from call_types.json: a warning names the file and the code, and the site still loads", () => {
  const root = fixtureRoot();
  writeJson(path.join(root, `data/fo_records/${ids.funded}.json`),
    fakeRecord(ids.funded, "Type 1", { category_codes: ["C1.1", "C9.9", "C2.1"] }));
  const { opportunities, warnings } = load(root);
  assert.equal(opportunities.length, 3, "the record is still on the site");
  assert.deepEqual(warnings.map((w) => [w.file, (w as { soft?: boolean }).soft]), [
    [`data/fo_records/${ids.funded}.json`, true],
    [`data/fo_records/${ids.funded}.json`, true],
  ]);
  assert.match(warnings[0].problem, /category code C9\.9 /);
  assert.match(warnings[1].problem, /category code C2\.1 is not a Type 1 category/);

  const check = runCheck(root);
  assert.equal(check.status, 1, "the gate rejects the record");
  assert.match(check.output, new RegExp(`WARNING data/fo_records/${ids.funded}\\.json: category code C9\\.9 `));
});

test("check-data fails when a category has no tag, and warns for the records that use it", () => {
  const root = fixtureRoot();
  editCallTypes(root, (raw) => {
    delete raw.types; // the site no longer uses the type entries
    delete raw.type_1[0].tag; // the category of the fake Type 1 record
  });
  const callTypes = callTypesOf(root);
  assert.ok(!callTypes[0].categories.some((c) => c.code === "C1.1"));

  const { status, output } = runCheck(root);
  assert.equal(status, 1);
  assert.match(output, /FAIL {2}resources\/call_types\.json/);
  assert.match(output, /type_1\[0\] \(C1\.1\): needs a non-empty tag/);
  // The record passes the gate, so its missing tag is a warning, not a failure of the record.
  assert.match(output, new RegExp(`PASS {2}data/fo_records/${ids.funded}\\.json`));
  assert.match(output, new RegExp(`WARNING data/fo_records/${ids.funded}\\.json: category code C1\\.1 `));
  // Counted: the call-types file once, and the build warning about it.
  // Not counted: the warning about the record that uses the category.
  assert.equal(output.match(/WARNING data\/fo_records\//g)?.length, 1);
  assert.match(output, /check-data: 2 problem\(s\) found/);
});

test("check-data fails when a category tag holds a category code, or a code sits under two types", () => {
  const root = fixtureRoot();
  editCallTypes(root, (raw) => {
    raw.type_1[1].tag = "TenneT leads (C1.2) an innovation project";
    raw.type_3[0].code = "C2.1";
  });
  const { status, output } = runCheck(root);
  assert.equal(status, 1);
  assert.match(output, /type_1\[1\] \(C1\.2\): the tag contains the category code C1\.2/);
  assert.match(output, /category code C2\.1 appears under more than one type: type_2, type_3/);
});
