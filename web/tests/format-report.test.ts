import assert from "node:assert/strict";
import test from "node:test";
import {
  allDeadlinesPassed,
  formatAmount,
  formatAmountRange,
  formatDate,
  formatMonthYear,
  formatProjectSize,
  formatProjectWindow,
  formatSubmissionWindow,
} from "../src/lib/format.ts";
import { sourceLines, splitReport, textBlocks } from "../src/lib/report.ts";
import type { FoReport } from "../src/lib/types.ts";
import { fullReport, repoRoot } from "./helpers/fixtures.ts";
import { readFileSync } from "node:fs";
import path from "node:path";

test("amounts follow RE_agent.md section 6", () => {
  assert.equal(formatAmount(250_000), "EUR 250,000");
  assert.equal(formatAmount(5_000_000), "EUR 5 million");
  assert.equal(formatAmount(1_500_000), "EUR 1.5 million");
  assert.equal(formatAmount(85_714_286), "EUR 85.71 million");
  assert.equal(formatAmount(1_500_000_000), "EUR 1.5 billion");
  assert.equal(formatAmountRange(500_000, 3_000_000), "EUR 0.5–3 million");
  assert.equal(formatAmountRange(2_000_000, 5_000_000), "EUR 2–5 million");
  assert.equal(formatAmountRange(50_000, 250_000), "EUR 50,000–250,000");
  assert.equal(formatAmountRange(50_000, 3_000_000), "EUR 50,000 – EUR 3 million");
});

test("project size on a card", () => {
  assert.equal(formatProjectSize(2_000_000, 5_000_000), "EUR 2–5 million");
  assert.equal(formatProjectSize(null, 5_000_000), "Up to EUR 5 million");
  assert.equal(formatProjectSize(2_000_000, null), "At least EUR 2 million");
  assert.equal(formatProjectSize(null, null), "Not published");
});

test("dates", () => {
  assert.equal(formatDate("2027-03-11"), "11 March 2027");
  assert.equal(formatMonthYear("2027-02-01"), "Feb 2027");
  assert.equal(formatProjectWindow("2027-09-01", "2030-08-31"), "1 September 2027 – 31 August 2030");
  assert.equal(formatProjectWindow(null, null), "Not published");
  assert.deepEqual(formatSubmissionWindow("2026-10-08", "2027-03-11"), [
    "Pre-submission: 8 October 2026",
    "Full proposal: 11 March 2027",
  ]);
  assert.deepEqual(formatSubmissionWindow(null, null), ["No deadline published"]);
});

test("a call is closed only when every published deadline has passed", () => {
  assert.equal(allDeadlinesPassed("2026-10-08", "2027-03-11", "2026-11-15"), false);
  assert.equal(allDeadlinesPassed("2026-10-08", "2027-03-11", "2027-03-11"), false);
  assert.equal(allDeadlinesPassed("2026-10-08", "2027-03-11", "2027-03-12"), true);
  assert.equal(allDeadlinesPassed(null, "2026-01-01", "2026-11-15"), true);
  assert.equal(allDeadlinesPassed(null, null, "2026-11-15"), false);
});

test("answers: lines become paragraphs, '- ' lines become bullets, nothing else changes", () => {
  assert.deepEqual(
    textBlocks("Two stages; **not bold**.  \n- Stage 1 — Pre-proposal: 8 October 2026\n- Stage 2\nAfter the list."),
    [
      { type: "paragraph", text: "Two stages; **not bold**." },
      { type: "list", items: ["Stage 1 — Pre-proposal: 8 October 2026", "Stage 2"] },
      { type: "paragraph", text: "After the list." },
    ],
  );
  assert.deepEqual(sourceLines("a.pdf · p. 1\nPage title · Section"), ["a.pdf · p. 1", "Page title · Section"]);
});

test("report: null answers are hidden, empty sections are hidden, blocks go to their side", () => {
  const card = (title: string, answer: string | null) => ({ title, answer, sources: answer && "src" });
  const { side, main } = splitReport({
    project_requirements: [
      { title: "Kept", question: "Q?", cards: [card("A", "yes"), card("B", null)] },
      { title: "All null", question: "Q?", cards: [card("C", null)] },
    ],
    funding_timing_submission: [{ title: "Funding", cards: [card("Envelope", "EUR 1 million")] }],
    some_future_block: [{ title: "New", cards: [card("D", "text")] }],
  });
  assert.deepEqual(side.map((s) => s.title), ["Funding"]);
  assert.deepEqual(main.map((s) => s.title), ["Kept", "New"]);
  assert.deepEqual(main[0].cards.map((c) => c.title), ["A"]);
  assert.equal(side[0].question, null);
});

// The detail page takes every title and question from the report file, so a
// fully answered template must come out exactly as the template is written.
for (const [name, mainBlock] of [
  ["fo_report_type_1_2.template.json", "project_requirements"],
  ["fo_report_type_3.template.json", "call_overview"],
] as const) {
  test(`${name}: every section and card is shown with the template's own title and question`, () => {
    const template: FoReport = JSON.parse(readFileSync(path.join(repoRoot, "templates", name), "utf8"));
    const { side, main } = splitReport(fullReport(name) as FoReport);
    const shape = (sections: { title: string; question?: string | null; cards: { title: string; question?: string | null }[] }[]) =>
      sections.map((s) => [s.title, s.question ?? null, s.cards.map((c) => [c.title, c.question ?? null])]);
    assert.deepEqual(shape(main), shape(template[mainBlock]));
    assert.deepEqual(shape(side), shape(template.funding_timing_submission));
    assert.ok(main.every((s) => s.question && s.cards.every((c) => c.question)), "main column: all have a question");
  });
}
