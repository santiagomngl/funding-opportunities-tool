import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { tagsFor } from "../build/call-type-tags.mjs";
import { loadSiteData } from "../build/load-data.mjs";
import type { CallTypeGroup } from "../src/lib/types.ts";
import { repoRoot } from "./helpers/fixtures.ts";

// The real resources/call_types.json, as the site loads it.
const callTypes = (loadSiteData(repoRoot).data as { callTypes: CallTypeGroup[] }).callTypes;
const rawCallTypes = JSON.parse(readFileSync(path.join(repoRoot, "resources/call_types.json"), "utf8"));
const group = (type: string) => callTypes.find((g) => g.type === type)!;
const tags = (call_type: string, category_codes: string[]) => {
  const { categories, unknownCodes } = tagsFor({ call_type, category_codes }, callTypes);
  return { categories: categories.map((c) => c.tag), unknownCodes };
};

// --- Tags ---------------------------------------------------------------------

test("call types: every category of the file is loaded, with its tag exactly as written", () => {
  assert.deepEqual(callTypes.map((g) => g.type), ["Type 1", "Type 2", "Type 3"]);
  for (const [type, key] of [["Type 1", "type_1"], ["Type 2", "type_2"], ["Type 3", "type_3"]]) {
    assert.deepEqual(
      group(type).categories.map((c) => [c.code, c.tag]),
      rawCallTypes[key].map((c: { code: string; tag: string }) => [c.code, c.tag]),
    );
  }
});

test("tags: one category tag per code, and no tag for the call type itself", () => {
  assert.deepEqual(tags("Type 1", ["C1.1"]), {
    categories: ["TenneT can receive funding as Lead of an infrastructure project"],
    unknownCodes: [],
  });
  assert.deepEqual(tags("Type 3", ["C3.3"]), {
    categories: ["TenneT cannot receive funding, nor take part, but may benefit from flexibility and demand that ease congestion"],
    unknownCodes: [],
  });
  assert.deepEqual(Object.keys(tagsFor({ call_type: "Type 1", category_codes: ["C1.1"] }, callTypes)), ["categories", "unknownCodes"]);
});

test("tags: two codes give two category tags, in the order of category_codes", () => {
  const find = (code: string) => rawCallTypes.type_2.find((c: { code: string }) => c.code === code).tag;
  assert.deepEqual(tags("Type 2", ["C2.4", "C2.1"]).categories, [find("C2.4"), find("C2.1")]);
});

test("tags: a code that is unknown, or belongs to another type, gets no tag and is reported", () => {
  assert.deepEqual(tags("Type 1", ["C1.3", "C9.9", "C2.1"]), {
    categories: [rawCallTypes.type_1[2].tag],
    unknownCodes: ["C9.9", "C2.1"],
  });
});

test("tags: the wording comes from the data, not from the code", () => {
  const edited: CallTypeGroup[] = [
    { type: "Type 1", categories: [{ code: "C1.1", tag: "An edited category tag", value: "An edited value", definition: "An edited definition" }] },
  ];
  const { categories } = tagsFor({ call_type: "Type 1", category_codes: ["C1.1"] }, edited);
  assert.deepEqual(categories, [{ tag: "An edited category tag", value: "An edited value", definition: "An edited definition" }]);
});

test("definitions: one per category code, exactly as in the file", () => {
  const { categories } = tagsFor({ call_type: "Type 2", category_codes: ["C2.1", "C2.4"] }, callTypes);
  const raw = (code: string) => rawCallTypes.type_2.find((c: { code: string }) => c.code === code);
  assert.deepEqual(
    categories.map((c) => [c.value, c.definition]),
    [[raw("C2.1").value, raw("C2.1").definition], [raw("C2.4").value, raw("C2.4").definition]],
  );
});
