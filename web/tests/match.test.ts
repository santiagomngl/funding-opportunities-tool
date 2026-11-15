import assert from "node:assert/strict";
import test from "node:test";
import { matchOpportunity, percentage, rankOpportunities } from "../src/lib/match.ts";
import { buildResults } from "../src/lib/results.ts";
import type { FoRecord, Opportunity, Selections } from "../src/lib/types.ts";

function opportunity(title: string, values: Partial<FoRecord["taxonomy_values"]>, extra: Partial<FoRecord> = {}): Opportunity {
  return {
    report: null,
    record: {
      id: title,
      display_title: title,
      organization_or_parent_framework: null,
      programme: null,
      call_title: title,
      call_module_title: null,
      call_year: 2020,
      url: null,
      executive_summary: null,
      pre_submission_deadline: null,
      full_proposal_deadline: null,
      earliest_project_start_date: "2027-01-01",
      project_end_date: "2030-12-31",
      minimum_project_size: null,
      maximum_project_size: null,
      call_type: "Type 1",
      category_codes: [],
      taxonomy_values: { topic: [], role: [], activity: [], outcome: [], ...values },
      ...extra,
    },
  };
}

const selections: Selections = {
  topic: ["T1", "T2"],
  role: ["R1"],
  activity: ["A1", "A2", "A3", "A4"],
  outcome: ["O1"],
};

test("score: the average, over the answered dimensions, of the share of selected codes matched", () => {
  const match = matchOpportunity(
    opportunity("x", { topic: ["T1", "T9"], role: ["R1"], activity: ["A1"], outcome: [] }),
    selections,
  );
  // topic 1/2, role 1/1, activity 1/4, outcome 0/1
  assert.equal(match.score, (0.5 + 1 + 0.25 + 0) / 4);
  assert.equal(match.matchedCount, 3);
  assert.equal(percentage(match.score), "44%");
});

test("score: a dimension the user left empty is not counted", () => {
  const match = matchOpportunity(opportunity("x", { topic: ["T1"] }), {
    topic: ["T1"], role: [], activity: [], outcome: [],
  });
  assert.equal(match.score, 1);
});

test("score: there is no 'applies to all' value", () => {
  const match = matchOpportunity(opportunity("x", { topic: ["[All]"] }), selections);
  assert.equal(match.matchedCount, 0);
});

test("ranking: zero overlap is hidden; ties go to more matched values, then the title", () => {
  const ranked = rankOpportunities(
    [
      opportunity("No overlap", { topic: ["T9"] }),
      opportunity("Beta", { topic: ["T1", "T2"] }), // 1 of 4 dimensions = 25%, 2 values
      opportunity("alpha", { role: ["R1"] }), // 25%, 1 value
      opportunity("Alpha 2", { outcome: ["O1"] }), // 25%, 1 value
      opportunity("Best", { topic: ["T1", "T2"], role: ["R1"] }), // 50%
    ],
    selections,
  );
  assert.deepEqual(
    ranked.map((m) => m.opportunity.record.display_title),
    ["Best", "Beta", "alpha", "Alpha 2"],
  );
});

test("filters hide cards and add notes, but the score is the same with and without them", () => {
  const opportunities = [
    opportunity("Fits", { topic: ["T1"] }),
    opportunity("Too small", { topic: ["T1", "T2"] }, { maximum_project_size: 50_000 }),
    opportunity("Too late", { role: ["R1"] }, { earliest_project_start_date: "2035-01-01", project_end_date: "2038-01-01" }),
    opportunity("Hidden by budget", { topic: ["T2"] }, { minimum_project_size: 900_000_000 }),
  ];
  const withoutFilters = rankOpportunities(opportunities, selections);
  const { cards, hiddenByFilters } = buildResults(
    opportunities,
    selections,
    { b1: 1_000_000, b2: 5_000_000 },
    { s1: "2027-01-01", s2: "2027-12-31" },
  );

  assert.deepEqual(cards.map((c) => c.match.opportunity.record.display_title), ["Too small", "Fits"]);
  assert.equal(hiddenByFilters, 2);
  assert.deepEqual(cards[0].filter.warnings, ["This call can fund part of your project (up to EUR 50,000)."]);
  for (const card of cards) {
    const unfiltered = withoutFilters.find((m) => m.opportunity === card.match.opportunity);
    assert.equal(card.match.score, unfiltered?.score);
  }
});
