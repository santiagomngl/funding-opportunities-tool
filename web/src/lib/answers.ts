// The answers of the questionnaire, and how the budget and timing sliders
// turn into the amounts and dates the filters use.

import { quarterEnd, quarterStart, type UserBudget, type UserTiming } from "./filters.ts";
import { formatAmount, formatAmountRange } from "./format.ts";
import { dimensions, type Selections } from "./types.ts";

/** Two slider positions: first and last. */
export type Range = [number, number];
export type Answers = { selections: Selections; budget: Range; start: Range; end: Range | null };

export const budgetStops = [
  10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  10_000_000, 25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000, 1_000_000_000,
] as const;
export const lastBudgetIndex = budgetStops.length - 1;

export const budgetPresets: Range[] = [[0, 3], [3, 6], [6, 8], [8, 10], [10, 12], [12, 15]];

// Timing sliders move in quarters. The start slider covers this year and the
// four after it; the optional end slider covers this year and the nine after it.
export const START_YEARS = 5;
export const END_YEARS = 10;
export const lastStartIndex = START_YEARS * 4 - 1;
export const lastEndIndex = END_YEARS * 4 - 1;

export const emptySelections = (): Selections => ({ topic: [], role: [], activity: [], outcome: [] });
export const defaultAnswers = (): Answers => ({
  selections: emptySelections(),
  budget: [2, 8],
  start: [6, 10],
  end: null,
});

export const selectedCount = (selections: Selections) =>
  dimensions.reduce((total, dimension) => total + selections[dimension].length, 0);

/** "EUR 50,000 – EUR 5 million"; the top of the slider means no upper limit ("+"). */
export function budgetLabel(range: Range) {
  const top = range[1] === lastBudgetIndex;
  return `${formatAmount(budgetStops[range[0]])} – ${formatAmount(budgetStops[range[1]])}${top ? "+" : ""}`;
}

/** A quick range, in the same words as every other amount: "EUR 0.1–1 million". */
export function presetLabel(range: Range) {
  const top = range[1] === lastBudgetIndex;
  return `${formatAmountRange(budgetStops[range[0]], budgetStops[range[1]])}${top ? "+" : ""}`;
}

export const quarterOf = (index: number, firstYear: number) => ({
  year: firstYear + Math.floor(index / 4),
  quarter: (index % 4) + 1,
});

export function quarterLabel(index: number, firstYear: number) {
  const { year, quarter } = quarterOf(index, firstYear);
  return `Q${quarter} ${year}`;
}

/** The end range cannot begin before the start range. */
export function keepEndAfterStart(end: Range, start: Range): Range {
  const first = Math.min(Math.max(end[0], start[0]), lastEndIndex - 1);
  return [first, Math.max(end[1], first + 1)];
}

export function toBudget(range: Range): UserBudget {
  return {
    b1: budgetStops[range[0]],
    b2: range[1] === lastBudgetIndex ? null : budgetStops[range[1]],
  };
}

/**
 * Quarters become dates by the best case: a range starts on the first day of
 * its first quarter and ends on the last day of its last quarter.
 */
export function toTiming(start: Range, end: Range | null, firstYear: number): UserTiming {
  const from = (index: number) => quarterStart(quarterOf(index, firstYear).year, quarterOf(index, firstYear).quarter);
  const to = (index: number) => quarterEnd(quarterOf(index, firstYear).year, quarterOf(index, firstYear).quarter);
  return {
    s1: from(start[0]),
    s2: to(start[1]),
    e1: end ? from(end[0]) : null,
    e2: end ? to(end[1]) : null,
  };
}
