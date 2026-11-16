// Clearly fake data for the tests. Nothing here describes a real call.
//
// makeFixtureRoot() builds a temporary folder shaped like the repository root
// (data/, resources/, templates/, SA_agent.md), using the real templates,
// taxonomy, call types and gate, plus the fake files below. Nothing is written
// into the real data/, resources/ or templates/.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));

export const FAKE_SOURCE = "FAKE FIXTURE SOURCE";
export const ids = {
  funded: "20200101-000000-01", // Type 1, with a report
  forOthers: "20200101-000000-02", // Type 3, with a report
  notRelevant: "20200101-000000-03",
  noReport: "20200101-000000-04", // Type 2, no report
};

type Json = Record<string, unknown>;

/** A record that passes the gate, with codes taken from the real resource files. */
export function fakeRecord(id: string, callType: string, overrides: Json = {}): Json {
  const taxonomy = readJson(path.join(repoRoot, "resources/tennet_taxonomy.json"));
  const callTypes = readJson(path.join(repoRoot, "resources/call_types.json"));
  const first = (dimension: string) => [taxonomy[dimension][0].code];
  const relevant = callType !== "Not relevant";
  const title = `FAKE FIXTURE call ${id.slice(-2)}`;
  const template = readJson(path.join(repoRoot, "templates/fo_record.template.json"));
  return {
    ...template,
    id,
    source: FAKE_SOURCE,
    display_title: `${title} – Fake Programme`,
    organization_or_parent_framework: "Fake Fixture Organisation",
    programme: "Fake Programme",
    call_title: title,
    call_year: 2020,
    url: "https://example.invalid/fake-fixture-call",
    executive_summary: "FAKE FIXTURE summary. This record exists only for tests.",
    pre_submission_deadline: "2020-03-01",
    full_proposal_deadline: "2020-06-01",
    earliest_project_start_date: "2027-09-01",
    project_end_date: "2030-08-31",
    minimum_project_size: 1_000_000,
    maximum_project_size: 5_000_000,
    date_last_checked: "2020-01-01",
    status_rationale: "FAKE FIXTURE rationale, written for tests only.",
    call_type: callType,
    category_codes: relevant
      ? [callTypes[`type_${callType.slice(-1)}`][0].code]
      : [],
    taxonomy_values: {
      topic: relevant ? first("topic") : [],
      role: relevant && callType !== "Type 3" ? first("role") : [],
      activity: relevant ? first("activity") : [],
      outcome: relevant ? first("outcome") : [],
    },
    ...overrides,
  };
}

/** A report template with the first card of every section answered; the rest stay null. */
export function fakeReport(templateName: string): Json {
  const report = readJson(path.join(repoRoot, "templates", templateName));
  for (const sections of Object.values(report) as { title: string; cards: Json[] }[][]) {
    for (const section of sections) {
      section.cards[0].answer =
        `FAKE FIXTURE answer for ${section.title}.\n- First fake bullet\n- Second fake bullet`;
      section.cards[0].sources = "fake-fixture.pdf · p. 1 · Fake section\nFake fixture page · Fake heading";
    }
  }
  return report;
}

/** A report template with every card answered, to look at the whole layout. */
export function fullReport(templateName: string): Json {
  const report = readJson(path.join(repoRoot, "templates", templateName));
  for (const sections of Object.values(report) as { cards: Json[] }[][]) {
    for (const section of sections) {
      for (const card of section.cards) {
        card.answer = `FAKE FIXTURE answer for ${card.title}.\n- First fake bullet\n- Second fake bullet`;
        card.sources = "fake-fixture.pdf · p. 1 · Fake section";
      }
    }
  }
  return report;
}

export function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

/** Writes the fake source, records and reports into `root` (a folder shaped like the repo root). */
export function writeFixtures(root: string) {
  const source = readJson(path.join(repoRoot, "templates/source.template.json"));
  writeJson(path.join(root, "resources/sources/fake_fixture_source.json"), { ...source, source_name: FAKE_SOURCE });
  const record = (id: string, type: string) =>
    writeJson(path.join(root, `data/fo_records/${id}.json`), fakeRecord(id, type));
  record(ids.funded, "Type 1");
  record(ids.forOthers, "Type 3");
  record(ids.notRelevant, "Not relevant");
  record(ids.noReport, "Type 2");
  writeJson(path.join(root, `data/fo_reports/${ids.funded}.json`), fakeReport("fo_report_type_1_2.template.json"));
  writeJson(path.join(root, `data/fo_reports/${ids.forOthers}.json`), fakeReport("fo_report_type_3.template.json"));
}

export function makeFixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "funding-desk-fixture-"));
  cpSync(path.join(repoRoot, "templates"), path.join(root, "templates"), { recursive: true });
  for (const file of ["resources/tennet_taxonomy.json", "resources/call_types.json", "SA_agent.md"]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(repoRoot, file), path.join(root, file));
  }
  writeFixtures(root);
  return root;
}

// `node tests/helpers/fixtures.ts <folder>` writes the fake files into a folder,
// for trying the site by hand. Remove them afterwards.
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2]) {
  writeFixtures(path.resolve(process.argv[2]));
  console.log(`Fake fixture files written into ${path.resolve(process.argv[2])}`);
}
