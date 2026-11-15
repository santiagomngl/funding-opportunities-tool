// Budget and timing filters (the rules are listed in docs/RESTRUCTURE_NOTES.md, section 5).
//
// They decide whether a result card is shown and add notes or a warning to it.
// They never change the match score. Pure functions: no dates from the clock,
// no data access.

import { formatAmount, formatMonthYear } from "./format.ts";

export type FilterStatus = "fits" | "partly" | "hidden";
export type FilterResult = { status: FilterStatus; notes: string[]; warning: string | null };

/** ISO dates. s1–s2 is the start range; e1–e2 the optional end range. */
export type UserTiming = { s1: string; s2: string; e1?: string | null; e2?: string | null };
/** Euros. b2 = null means no upper limit (the top of the slider). */
export type UserBudget = { b1: number; b2: number | null };

const fits = (notes: string[] = []): FilterResult => ({ status: "fits", notes, warning: null });
const partly = (warning: string): FilterResult => ({ status: "partly", notes: [], warning });
const hidden: FilterResult = { status: "hidden", notes: [], warning: null };

/**
 * cs = earliest_project_start_date, ce = project_end_date.
 * A null call date sets no limit on that side.
 */
export function timingFilter(user: UserTiming, cs: string | null, ce: string | null): FilterResult {
  const { s1, s2 } = user;
  if ((cs !== null && s2 < cs) || (ce !== null && s1 > ce)) return hidden;

  const notes: string[] = [];
  if (cs !== null && s1 < cs) notes.push(`Fits if you start in ${formatMonthYear(cs)} or later`);

  const { e1, e2 } = user;
  if (!e1 || !e2 || ce === null) return fits(notes); // no end range, or no end limit

  if (e1 > ce) return partly(`Only work until ${formatMonthYear(ce)} is funded.`);
  if (e2 > ce) notes.push(`Fits if you finish by ${formatMonthYear(ce)}`);
  return fits(notes);
}

/** cMin = minimum_project_size, cMax = maximum_project_size. */
export function budgetFilter(user: UserBudget, cMin: number | null, cMax: number | null): FilterResult {
  const b1 = user.b1;
  const b2 = user.b2 ?? Infinity;
  const partOnly = (limit: number) =>
    partly(`This call can fund part of your project (up to ${formatAmount(limit)}).`);
  const minimumNote = (limit: number) => `Fits if the project is at least ${formatAmount(limit)}`;

  if (cMin !== null && cMax !== null) {
    if (b2 < cMin) return hidden;
    if (b1 > cMax) return partOnly(cMax);
    const notes: string[] = [];
    if (b1 < cMin) notes.push(minimumNote(cMin));
    if (b2 > cMax) notes.push(`Fits if the project stays at or below ${formatAmount(cMax)}`);
    return fits(notes);
  }
  if (cMax !== null) {
    // A single value P: the project fits when P lies inside the user's range.
    if (b2 < cMax) return hidden;
    if (b1 > cMax) return partOnly(cMax);
    return fits();
  }
  if (cMin !== null) {
    if (b2 < cMin) return hidden;
    return fits(b1 < cMin ? [minimumNote(cMin)] : []);
  }
  return fits();
}

export type CardFilter = { hidden: boolean; notes: string[]; warnings: string[] };

/** Hidden if either filter hides; otherwise the notes and warnings of both. */
export function combineFilters(timing: FilterResult, budget: FilterResult): CardFilter {
  const results = [timing, budget];
  return {
    hidden: results.some((r) => r.status === "hidden"),
    notes: results.flatMap((r) => r.notes),
    warnings: results.flatMap((r) => (r.warning ? [r.warning] : [])),
  };
}

// --- Quarter sliders -> dates, by the best case -------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

/** First day of a quarter (1–4): the earliest date the user could mean. */
export function quarterStart(year: number, quarter: number) {
  return `${year}-${pad(quarter * 3 - 2)}-01`;
}

/** Last day of a quarter (1–4): the latest date the user could mean. */
export function quarterEnd(year: number, quarter: number) {
  const month = quarter * 3;
  return `${year}-${pad(month)}-${month === 6 || month === 9 ? 30 : 31}`;
}
