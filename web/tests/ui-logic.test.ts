import assert from "node:assert/strict";
import test from "node:test";
import { budgetLabel, defaultAnswers, presetLabel, budgetPresets, toBudget, toTiming } from "../src/lib/answers.ts";
import { closesIn, daysUntil, deadlineStatus, splitTitle } from "../src/lib/format.ts";
import { buildListing, defaultListingOptions } from "../src/lib/listing.ts";
import { buildHash, parseHash, type RouteContext } from "../src/lib/route.ts";
import type { FoRecord, Opportunity } from "../src/lib/types.ts";

const context: RouteContext = {
  steps: ["topic", "role", "activity", "outcome", "budget", "timing"],
  codes: { topic: ["T1", "T2", "T3"], role: ["R1", "R2"], activity: ["A1"], outcome: ["O1"] },
  opportunityIds: ["a", "b", "c"],
  firstYear: 2026,
};

function opportunity(id: string, title: string, full: string | null, topic: string[]): Opportunity {
  const record: FoRecord = {
    id,
    display_title: title,
    organization_or_parent_framework: "European Commission",
    programme: "Horizon Europe",
    call_title: "ENERGY",
    call_module_title: null,
    call_year: 2027,
    url: null,
    pre_submission_deadline: null,
    full_proposal_deadline: full,
    earliest_project_start_date: null,
    project_end_date: null,
    minimum_project_size: null,
    maximum_project_size: null,
    call_type: "Type 1",
    category_codes: [],
    taxonomy_values: { topic, role: [], activity: [], outcome: [] },
  };
  return { record, report: null };
}

test("a title is shown without the programme, with the call ID apart", () => {
  assert.deepEqual(
    splitTitle("HORIZON-CL5-2027-07-D3-25 Advanced TSO control rooms – Horizon Europe", "Horizon Europe"),
    { callId: "HORIZON-CL5-2027-07-D3-25", title: "Advanced TSO control rooms" },
  );
  assert.deepEqual(splitTitle("HORIZON-CL4-2027-02-MAT-PROD-32-two-stage Efficient energy input (IA)", null), {
    callId: "HORIZON-CL4-2027-02-MAT-PROD-32-two-stage",
    title: "Efficient energy input (IA)",
  });
  assert.deepEqual(splitTitle("EU-wide-grid study", null), { callId: null, title: "EU-wide-grid study" });
  // Nothing to cut: the title stays as written.
  assert.deepEqual(splitTitle("Grid-forming converters – a study", "Horizon Europe"), {
    callId: null,
    title: "Grid-forming converters – a study",
  });
  assert.deepEqual(splitTitle("DEI+ Energy innovation", null), { callId: null, title: "DEI+ Energy innovation" });
  assert.deepEqual(splitTitle("Horizon Europe", "Horizon Europe"), { callId: null, title: "Horizon Europe" });
});

test("the next deadline, in days", () => {
  assert.equal(daysUntil("2027-03-18", "2026-11-16"), 122);
  assert.deepEqual(deadlineStatus("2026-12-01", "2027-03-18", "2026-11-16"), {
    kind: "open", step: "Pre-submission", date: "2026-12-01", days: 15,
  });
  // A passed pre-submission deadline leaves the full proposal as the next one.
  assert.deepEqual(deadlineStatus("2026-10-01", "2027-03-18", "2026-11-16"), {
    kind: "open", step: "Full proposal", date: "2027-03-18", days: 122,
  });
  assert.deepEqual(deadlineStatus(null, "2026-11-15", "2026-11-16"), { kind: "closed" });
  assert.deepEqual(deadlineStatus(null, null, "2026-11-16"), { kind: "none" });
  assert.equal(closesIn(0), "Closes today");
  assert.equal(closesIn(1), "Closes tomorrow");
  assert.equal(closesIn(122), "Closes in 122 days");
});

test("quick ranges use the same amount format as the rest of the site", () => {
  assert.deepEqual(budgetPresets.map(presetLabel), [
    "EUR 10,000–100,000",
    "EUR 0.1–1 million",
    "EUR 1–5 million",
    "EUR 5–25 million",
    "EUR 25–100 million",
    "EUR 0.1–1 billion+",
  ]);
  assert.equal(budgetLabel([2, 8]), "EUR 50,000 – EUR 5 million");
  assert.deepEqual(toBudget([2, 15]), { b1: 50_000, b2: null });
  assert.deepEqual(toTiming([6, 10], null, 2026), { s1: "2027-07-01", s2: "2028-09-30", e1: null, e2: null });
});

test("an address carries the screen and the answers, and reads back the same", () => {
  const answers = defaultAnswers();
  answers.selections.topic = ["T1", "T3"];
  answers.selections.role = ["R2"];
  answers.end = [14, 22];
  const hash = buildHash({ screen: "results" }, answers, context);
  assert.equal(hash, "#/results?t=T1.T3&r=R2&b=2-8&s=2027Q3-2028Q3&e=2029Q3-2031Q3");
  assert.deepEqual(parseHash(hash, context), { route: { screen: "results" }, answers });

  assert.equal(buildHash({ screen: "intro" }, answers, context), "");
  assert.deepEqual(parseHash(buildHash({ screen: "questions", step: 4 }, answers, context), context).route, {
    screen: "questions", step: 4,
  });
  assert.deepEqual(
    parseHash(buildHash({ screen: "opportunity", id: "b", ranked: true }, answers, context), context),
    { route: { screen: "opportunity", id: "b", ranked: true }, answers },
  );
  assert.equal(buildHash({ screen: "opportunity", id: "b", ranked: false }, answers, context), "#/opportunity/b");
});

test("an address that is old, broken or without answers still opens a screen", () => {
  // The format of links shared before this change.
  assert.deepEqual(parseHash("#opportunity=c", context), {
    route: { screen: "opportunity", id: "c", ranked: false }, answers: null,
  });
  assert.deepEqual(parseHash("", context).route, { screen: "intro" });
  assert.deepEqual(parseHash("#/opportunity/unknown", context).route, { screen: "browse" });
  // Results without a single answer is the full list.
  assert.deepEqual(parseHash("#/results?b=2-8", context).route, { screen: "browse" });
  // Unknown codes are dropped and out-of-range sliders are pulled back in.
  const parsed = parseHash("#/results?t=T9.T2&b=7-99&s=1999Q1-2099Q4", context);
  assert.deepEqual(parsed.answers?.selections.topic, ["T2"]);
  assert.deepEqual(parsed.answers?.budget, [7, 15]);
  assert.deepEqual(parsed.answers?.start, [0, 19]);
});

test("the list: search, open calls only and the two sort orders", () => {
  const today = "2026-11-16";
  const all = [
    opportunity("a", "HORIZON-A-1-2 Alpha cables", "2027-06-01", ["T1", "T2"]),
    opportunity("b", "HORIZON-B-1-2 Beta storage", "2026-12-01", ["T1"]),
    opportunity("c", "HORIZON-C-1-2 Gamma storage", "2026-01-01", ["T1", "T2"]),
    opportunity("d", "HORIZON-D-1-2 Delta markets", null, []),
  ];
  const answers = defaultAnswers();
  answers.selections.topic = ["T1", "T2"];
  const profile = { selections: answers.selections, budget: toBudget(answers.budget), timing: toTiming(answers.start, null, 2026) };
  const ids = (options = defaultListingOptions, ranked = true) =>
    buildListing(all, ranked ? profile : null, options, today).cards.map((card) => card.opportunity.record.id);

  assert.deepEqual(ids(), ["a", "c", "b"]); // by score; "d" shares no answer
  assert.deepEqual(ids({ ...defaultListingOptions, sort: "deadline" }), ["b", "a", "c"]); // closed last
  assert.deepEqual(ids({ ...defaultListingOptions, openOnly: true }), ["a", "b"]);
  assert.deepEqual(ids({ ...defaultListingOptions, query: "storage" }), ["c", "b"]);
  assert.deepEqual(ids({ ...defaultListingOptions, query: "horizon-b" }), ["b"]);
  // Without a profile: every opportunity, soonest deadline first, no score.
  assert.deepEqual(ids(defaultListingOptions, false), ["b", "a", "d", "c"]);
  const browse = buildListing(all, null, defaultListingOptions, today);
  assert.equal(browse.total, 4);
  assert.ok(browse.cards.every((card) => card.match === null));
});
