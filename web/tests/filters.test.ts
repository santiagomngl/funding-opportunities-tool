import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetFilter,
  combineFilters,
  quarterEnd,
  quarterStart,
  timingFilter,
} from "../src/lib/filters.ts";

// The call accepts projects from 1 Feb 2027 (CS) to 30 Jun 2030 (CE).
const CS = "2027-02-01";
const CE = "2030-06-30";
const fits = (notes: string[] = []) => ({ status: "fits", notes, warning: null });
const hidden = { status: "hidden", notes: [], warning: null };
const partly = (warning: string) => ({ status: "partly", notes: [], warning });

test("timing: hidden when the latest start is before the call's earliest start (S2 < CS)", () => {
  assert.deepEqual(timingFilter({ s1: "2026-01-01", s2: "2027-01-31" }, CS, CE), hidden);
  assert.deepEqual(
    timingFilter({ s1: "2026-01-01", s2: "2027-01-31", e1: "2028-01-01", e2: "2029-12-31" }, CS, CE),
    hidden,
  );
});

test("timing: hidden when the earliest start is after the call's end (S1 > CE)", () => {
  assert.deepEqual(timingFilter({ s1: "2030-07-01", s2: "2030-12-31" }, CS, CE), hidden);
});

test("timing: fits without a note when start and end lie inside the call's window", () => {
  assert.deepEqual(
    timingFilter({ s1: "2027-04-01", s2: "2027-12-31", e1: "2029-01-01", e2: "2030-06-30" }, CS, CE),
    fits(),
  );
});

test("timing: boundaries count as inside (S2 = CS, S1 = CE, E1 = CE)", () => {
  assert.equal(timingFilter({ s1: "2026-10-01", s2: CS }, CS, CE).status, "fits");
  assert.equal(timingFilter({ s1: CE, s2: "2030-12-31" }, CS, CE).status, "fits");
  assert.equal(
    timingFilter({ s1: "2027-04-01", s2: "2027-12-31", e1: CE, e2: "2031-12-31" }, CS, CE).status,
    "fits",
  );
});

test("timing: note when part of the start range is too early (S1 < CS)", () => {
  assert.deepEqual(
    timingFilter({ s1: "2026-10-01", s2: "2027-06-30", e1: "2029-01-01", e2: "2030-03-31" }, CS, CE),
    fits(["Fits if you start in Feb 2027 or later"]),
  );
});

test("timing: note when part of the end range is too late (E2 > CE)", () => {
  assert.deepEqual(
    timingFilter({ s1: "2027-04-01", s2: "2027-12-31", e1: "2030-01-01", e2: "2031-12-31" }, CS, CE),
    fits(["Fits if you finish by Jun 2030"]),
  );
});

test("timing: both notes together", () => {
  assert.deepEqual(
    timingFilter({ s1: "2026-10-01", s2: "2027-12-31", e1: "2030-01-01", e2: "2031-12-31" }, CS, CE),
    fits(["Fits if you start in Feb 2027 or later", "Fits if you finish by Jun 2030"]),
  );
});

test("timing: partly when the start works but every possible end is after CE", () => {
  assert.deepEqual(
    timingFilter({ s1: "2027-04-01", s2: "2027-12-31", e1: "2030-07-01", e2: "2031-12-31" }, CS, CE),
    partly("Only work until Jun 2030 is funded."),
  );
});

test("timing: with no end range only the start is checked", () => {
  assert.deepEqual(timingFilter({ s1: "2027-04-01", s2: "2027-12-31" }, CS, CE), fits());
  assert.deepEqual(timingFilter({ s1: "2027-04-01", s2: "2027-12-31", e1: null, e2: null }, CS, CE), fits());
  assert.deepEqual(timingFilter({ s1: "2026-01-01", s2: "2027-01-31" }, CS, CE), hidden);
  assert.deepEqual(timingFilter({ s1: "2030-07-01", s2: "2030-12-31" }, CS, CE), hidden);
  assert.deepEqual(
    timingFilter({ s1: "2026-10-01", s2: "2027-06-30" }, CS, CE),
    fits(["Fits if you start in Feb 2027 or later"]),
  );
});

test("timing: a record without project dates is not filtered", () => {
  assert.deepEqual(
    timingFilter({ s1: "2026-01-01", s2: "2026-12-31", e1: "2040-01-01", e2: "2040-12-31" }, null, null),
    fits(),
  );
});

test("quarters become dates by the best case", () => {
  assert.equal(quarterStart(2027, 1), "2027-01-01");
  assert.equal(quarterStart(2027, 3), "2027-07-01");
  assert.equal(quarterEnd(2027, 1), "2027-03-31");
  assert.equal(quarterEnd(2027, 2), "2027-06-30");
  assert.equal(quarterEnd(2027, 3), "2027-09-30");
  assert.equal(quarterEnd(2027, 4), "2027-12-31");
  // A call that starts on the last day of the user's last quarter still fits.
  assert.equal(
    timingFilter({ s1: quarterStart(2026, 4), s2: quarterEnd(2027, 1) }, "2027-03-31", CE).status,
    "fits",
  );
});

// The call accepts projects of EUR 1 million (CMin) to EUR 5 million (CMax).
const M = 1_000_000;

test("budget range: hidden when the whole budget is below the minimum (B2 < CMin)", () => {
  assert.deepEqual(budgetFilter({ b1: 100_000, b2: 500_000 }, M, 5 * M), hidden);
});

test("budget range: fits without a note when the budget lies inside", () => {
  assert.deepEqual(budgetFilter({ b1: 2 * M, b2: 5 * M }, M, 5 * M), fits());
  assert.deepEqual(budgetFilter({ b1: M, b2: M }, M, 5 * M), fits());
});

test("budget range: note when part of the budget is below the minimum (B1 < CMin)", () => {
  assert.deepEqual(
    budgetFilter({ b1: 500_000, b2: 2 * M }, M, 5 * M),
    fits(["Fits if the project is at least EUR 1 million"]),
  );
});

test("budget range: note when part of the budget is above the maximum (B2 > CMax)", () => {
  assert.deepEqual(
    budgetFilter({ b1: 2 * M, b2: 10 * M }, M, 5 * M),
    fits(["Fits if the project stays at or below EUR 5 million"]),
  );
});

test("budget range: both notes together", () => {
  assert.deepEqual(budgetFilter({ b1: 250_000, b2: 10 * M }, M, 5 * M), fits([
    "Fits if the project is at least EUR 1 million",
    "Fits if the project stays at or below EUR 5 million",
  ]));
});

test("budget range: partly when the whole budget is above the maximum (B1 > CMax)", () => {
  assert.deepEqual(
    budgetFilter({ b1: 10 * M, b2: 25 * M }, M, 5 * M),
    partly("This call can fund part of your project (up to EUR 5 million)."),
  );
});

test("budget single value P: hidden if B2 < P, fits if B1 ≤ P ≤ B2, partly if B1 > P", () => {
  assert.deepEqual(budgetFilter({ b1: 100_000, b2: M }, null, 5 * M), hidden);
  assert.deepEqual(budgetFilter({ b1: M, b2: 10 * M }, null, 5 * M), fits());
  assert.deepEqual(budgetFilter({ b1: 5 * M, b2: 5 * M }, null, 5 * M), fits());
  assert.deepEqual(
    budgetFilter({ b1: 10 * M, b2: 25 * M }, null, 250_000),
    partly("This call can fund part of your project (up to EUR 250,000)."),
  );
});

test("budget open case: only the minimum filled", () => {
  assert.deepEqual(budgetFilter({ b1: 100_000, b2: 500_000 }, M, null), hidden);
  assert.deepEqual(budgetFilter({ b1: 2 * M, b2: 500 * M }, M, null), fits());
  assert.deepEqual(
    budgetFilter({ b1: 500_000, b2: 2 * M }, M, null),
    fits(["Fits if the project is at least EUR 1 million"]),
  );
});

test("budget open case: neither size filled means no budget filter", () => {
  assert.deepEqual(budgetFilter({ b1: 10_000, b2: 25_000 }, null, null), fits());
});

test("budget open case: the top of the slider means no upper limit for B2", () => {
  assert.deepEqual(budgetFilter({ b1: 100_000, b2: null }, 2000 * M, 3000 * M).status, "fits");
  assert.deepEqual(budgetFilter({ b1: 100_000, b2: null }, null, 3000 * M), fits());
  assert.deepEqual(budgetFilter({ b1: 100_000, b2: null }, 2000 * M, null).status, "fits");
});

test("combining: hidden if either is hidden; warnings and notes of both are kept", () => {
  assert.equal(combineFilters(hidden as never, fits() as never).hidden, true);
  assert.equal(combineFilters(fits() as never, hidden as never).hidden, true);
  assert.deepEqual(
    combineFilters(
      timingFilter({ s1: "2027-04-01", s2: "2027-12-31", e1: "2030-07-01", e2: "2031-12-31" }, CS, CE),
      budgetFilter({ b1: 500_000, b2: 2 * M }, M, 5 * M),
    ),
    {
      hidden: false,
      notes: ["Fits if the project is at least EUR 1 million"],
      warnings: ["Only work until Jun 2030 is funded."],
    },
  );
  assert.deepEqual(
    combineFilters(
      timingFilter({ s1: "2027-04-01", s2: "2027-12-31" }, CS, CE),
      budgetFilter({ b1: 10 * M, b2: 25 * M }, M, 5 * M),
    ).warnings,
    ["This call can fund part of your project (up to EUR 5 million)."],
  );
});
