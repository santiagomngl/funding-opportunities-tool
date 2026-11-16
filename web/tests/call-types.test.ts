import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { tagsFor } from "../build/call-type-tags.mjs";
import { loadSiteData } from "../build/load-data.mjs";
import {
  applyCallTypeFilter,
  countOptions,
  passesCallTypeFilter,
  toggleCategory,
  toggleType,
  typeState,
} from "../src/lib/call-type-filter.ts";
import { buildResults } from "../src/lib/results.ts";
import type { CallTypeGroup, FoRecord, Opportunity, Selections } from "../src/lib/types.ts";
import { repoRoot } from "./helpers/fixtures.ts";

// The real resources/call_types.json, as the site loads it.
const callTypes = (loadSiteData(repoRoot).data as { callTypes: CallTypeGroup[] }).callTypes;
const rawCallTypes = JSON.parse(readFileSync(path.join(repoRoot, "resources/call_types.json"), "utf8"));
const group = (type: string) => callTypes.find((g) => g.type === type)!;
const tags = (call_type: string, category_codes: string[]) => {
  const { type, categories, unknownCodes } = tagsFor({ call_type, category_codes }, callTypes);
  return { type: type?.tag ?? null, categories: categories.map((c) => c.tag), unknownCodes };
};

function opportunity(title: string, call_type: FoRecord["call_type"], category_codes: string[], extra: Partial<FoRecord> = {}): Opportunity {
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
      call_type,
      category_codes,
      taxonomy_values: { topic: ["T1"], role: [], activity: [], outcome: [] },
      ...extra,
    },
  };
}

// --- Tags ---------------------------------------------------------------------

test("call types: every type and category of the file is loaded, with its tag exactly as written", () => {
  assert.deepEqual(callTypes.map((g) => [g.type, g.tag]), rawCallTypes.types.map((t: { type: string; tag: string }) => [t.type, t.tag]));
  for (const [type, key] of [["Type 1", "type_1"], ["Type 2", "type_2"], ["Type 3", "type_3"]]) {
    assert.deepEqual(
      group(type).categories.map((c) => [c.code, c.tag]),
      rawCallTypes[key].map((c: { code: string; tag: string }) => [c.code, c.tag]),
    );
  }
});

test("tags: the type's tag, then one category tag per code (the wording of the attached file)", () => {
  assert.deepEqual(tags("Type 1", ["C1.1"]), {
    type: "Call Type 1: TenneT can receive funding",
    categories: ["TenneT can receive funding as Lead of an infrastructure project"],
    unknownCodes: [],
  });
  assert.deepEqual(tags("Type 3", ["C3.3"]), {
    type: "Call Type 3: TenneT cannot receive funding, nor take part",
    categories: ["TenneT cannot receive funding, nor take part, but may benefit from flexibility and demand that ease congestion"],
    unknownCodes: [],
  });
});

test("tags: two codes give the type tag once and two category tags, in the order of category_codes", () => {
  const find = (code: string) => rawCallTypes.type_2.find((c: { code: string }) => c.code === code).tag;
  assert.deepEqual(tags("Type 2", ["C2.4", "C2.1"]).categories, [find("C2.4"), find("C2.1")]);
  assert.equal(tags("Type 2", ["C2.4", "C2.1"]).type, rawCallTypes.types[1].tag);
});

test("tags: a code that is unknown, or belongs to another type, gets no tag and is reported", () => {
  assert.deepEqual(tags("Type 1", ["C1.3", "C9.9", "C2.1"]), {
    type: rawCallTypes.types[0].tag,
    categories: [rawCallTypes.type_1[2].tag],
    unknownCodes: ["C9.9", "C2.1"],
  });
});

test("tags: the wording comes from the data, not from the code", () => {
  const edited: CallTypeGroup[] = [
    { type: "Type 1", tag: "An edited type tag", definition: "", categories: [{ code: "C1.1", tag: "An edited category tag", value: "An edited value", definition: "An edited definition" }] },
  ];
  const { type, categories } = tagsFor({ call_type: "Type 1", category_codes: ["C1.1"] }, edited);
  assert.equal(type?.tag, "An edited type tag");
  assert.deepEqual(categories.map((c) => c.tag), ["An edited category tag"]);
  assert.deepEqual(categories.map((c) => [c.value, c.definition]), [["An edited value", "An edited definition"]]);
});

test("definitions: the type's definition and one per category code, exactly as in the file", () => {
  const { type, categories } = tagsFor({ call_type: "Type 2", category_codes: ["C2.1", "C2.4"] }, callTypes);
  const raw = (code: string) => rawCallTypes.type_2.find((c: { code: string }) => c.code === code);
  assert.equal(type?.definition, rawCallTypes.types[1].definition);
  assert.deepEqual(
    categories.map((c) => [c.value, c.definition]),
    [[raw("C2.1").value, raw("C2.1").definition], [raw("C2.4").value, raw("C2.4").definition]],
  );
});

// --- Filter -------------------------------------------------------------------

const selections: Selections = { topic: ["T1", "T2"], role: [], activity: [], outcome: [] };
const budget = { b1: 1_000_000, b2: 5_000_000 };
const timing = { s1: "2027-01-01", s2: "2027-12-31" };
const opportunities = [
  opportunity("Funded partner", "Type 1", ["C1.3"], { taxonomy_values: { topic: ["T1", "T2"], role: [], activity: [], outcome: [] } }),
  opportunity("Research and support", "Type 2", ["C2.1", "C2.4"]),
  opportunity("Partly, lead", "Type 1", ["C1.2"], { maximum_project_size: 50_000 }),
  opportunity("Flexibility", "Type 3", ["C3.3"]),
  opportunity("Hidden by budget", "Type 1", ["C1.3"], { minimum_project_size: 900_000_000 }),
  opportunity("No overlap", "Type 1", ["C1.3"], { taxonomy_values: { topic: ["T9"], role: [], activity: [], outcome: [] } }),
];
const { cards } = buildResults(opportunities, selections, budget, timing);
const titles = (list: typeof cards) => list.map((c) => c.match.opportunity.record.display_title);
const select = (...codes: string[]) => new Set(codes);

test("filter: nothing selected shows everything", () => {
  assert.equal(passesCallTypeFilter(["C1.3"], select()), true);
  assert.equal(passesCallTypeFilter([], select()), true);
  assert.deepEqual(applyCallTypeFilter(cards, select()), cards);
});

test("filter: one category shows only the records that hold it", () => {
  assert.deepEqual(titles(applyCallTypeFilter(cards, select("C1.3"))), ["Funded partner"]);
  assert.equal(passesCallTypeFilter([], select("C1.3")), false);
});

test("filter: a record with two codes passes when either is selected", () => {
  assert.deepEqual(titles(applyCallTypeFilter(cards, select("C2.1"))), ["Research and support"]);
  assert.deepEqual(titles(applyCallTypeFilter(cards, select("C2.4"))), ["Research and support"]);
  assert.deepEqual(titles(applyCallTypeFilter(cards, select("C2.4", "C3.3"))), ["Flexibility", "Research and support"]);
});

test("filter: ticking a type heading selects all its categories; ticking it again clears them", () => {
  const type1 = group("Type 1");
  const all = toggleType(select("C3.3"), type1);
  assert.deepEqual([...all].sort(), ["C1.1", "C1.2", "C1.3", "C1.4", "C3.3"]);
  assert.equal(typeState(all, type1), "all");
  assert.deepEqual(titles(applyCallTypeFilter(cards, toggleType(select(), type1))), ["Funded partner", "Partly, lead"]);
  assert.deepEqual([...toggleType(all, type1)], ["C3.3"]);
});

test("filter: a heading is partly ticked when only some of its categories are on", () => {
  const type1 = group("Type 1");
  assert.equal(typeState(select(), type1), "none");
  assert.equal(typeState(select("C1.3"), type1), "some");
  assert.equal(typeState(select("C2.1"), type1), "none");
  // From partly ticked, the heading selects the rest.
  assert.equal(typeState(toggleType(select("C1.3"), type1), type1), "all");
  assert.deepEqual([...toggleCategory(select("C1.3"), "C1.2")].sort(), ["C1.2", "C1.3"]);
  assert.deepEqual([...toggleCategory(select("C1.3"), "C1.3")], []);
});

test("filter: counts are over the cards left after score, budget and timing, and do not move with the selection", () => {
  const counts = countOptions(cards, callTypes);
  // "Hidden by budget" and "No overlap" also hold C1.3, but are not on the page.
  assert.equal(counts.byCategory["C1.3"], 1);
  assert.equal(counts.byCategory["C1.2"], 1);
  assert.equal(counts.byCategory["C1.1"], 0);
  assert.equal(counts.byCategory["C2.1"], 1);
  assert.equal(counts.byCategory["C2.4"], 1);
  assert.equal(counts.byCategory["C3.3"], 1);
  // A record with two codes of one type counts once for the type.
  assert.deepEqual(counts.byType, { "Type 1": 2, "Type 2": 1, "Type 3": 1 });
  // Every option has a count, also the ones no card holds.
  for (const g of callTypes) for (const c of g.categories) assert.equal(typeof counts.byCategory[c.code], "number");
});

test("filter: an option no card holds gives the empty state, while cards remain to show again", () => {
  assert.deepEqual(applyCallTypeFilter(cards, select("C1.1")), []);
  assert.ok(cards.length > 0);
});

test("filter: the same answers give the same scores and the same order with the filter on and off", () => {
  assert.deepEqual(titles(cards), ["Funded partner", "Flexibility", "Partly, lead", "Research and support"]);
  const before = JSON.stringify(cards);
  for (const selected of [select("C1.3", "C2.1"), toggleType(select(), group("Type 1")), select("C3.3", "C2.4", "C1.2")]) {
    const shown = applyCallTypeFilter(cards, selected);
    // The shown cards are the very same objects (score, percentage and notes untouched) …
    for (const card of shown) assert.ok(cards.includes(card));
    // … in the same relative order as without the filter.
    assert.deepEqual(titles(shown), titles(cards).filter((title) => titles(shown).includes(title)));
  }
  assert.equal(JSON.stringify(cards), before, "filtering changes nothing in the ranked list");
});

test("filter: a card hidden by budget or timing never appears; a Partly card keeps its warning", () => {
  const shown = applyCallTypeFilter(cards, toggleType(select(), group("Type 1")));
  assert.ok(!titles(shown).includes("Hidden by budget"));
  const partly = shown.find((c) => c.match.opportunity.record.display_title === "Partly, lead");
  assert.deepEqual(partly?.filter.warnings, ["This call can fund part of your project (up to EUR 50,000)."]);
});
