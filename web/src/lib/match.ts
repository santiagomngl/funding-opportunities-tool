// Match score, on taxonomy codes.
//
// For each dimension the user answered: the share of the user's selected codes
// that the record also has. The score is the average of those shares.
// Budget and timing play no part here (see filters.ts).

import { dimensions, type Dimension, type Opportunity, type Selections } from "./types.ts";

export type Match = {
  opportunity: Opportunity;
  /** 0 to 1. */
  score: number;
  /** How many selected codes the record has, over all dimensions. */
  matchedCount: number;
  matches: Record<Dimension, string[]>;
};

export function matchOpportunity(opportunity: Opportunity, selections: Selections): Match {
  const values = opportunity.record.taxonomy_values;
  const matches = Object.fromEntries(
    dimensions.map((d) => [d, selections[d].filter((code) => values[d].includes(code))]),
  ) as Record<Dimension, string[]>;

  const answered = dimensions.filter((d) => selections[d].length > 0);
  const score = answered.length
    ? answered.reduce((sum, d) => sum + matches[d].length / selections[d].length, 0) / answered.length
    : 0;
  const matchedCount = dimensions.reduce((sum, d) => sum + matches[d].length, 0);

  return { opportunity, score, matchedCount, matches };
}

/**
 * Records with at least one matched code, best first. Ties: more matched
 * values first, then alphabetically by display_title.
 */
export function rankOpportunities(opportunities: Opportunity[], selections: Selections): Match[] {
  return opportunities
    .map((opportunity) => matchOpportunity(opportunity, selections))
    .filter((match) => match.matchedCount > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.matchedCount - a.matchedCount ||
        a.opportunity.record.display_title.localeCompare(b.opportunity.record.display_title, "en"),
    );
}

export function percentage(score: number) {
  return `${Math.round(score * 100)}%`;
}
