// The results list: rank by match score, then apply the budget and timing
// filters. The filters only hide cards or add notes; the score is untouched.

import { budgetFilter, combineFilters, timingFilter, type CardFilter, type UserBudget, type UserTiming } from "./filters.ts";
import { rankOpportunities, type Match } from "./match.ts";
import type { Opportunity, Selections } from "./types.ts";

export type ResultCard = { match: Match; filter: CardFilter };

export function buildResults(
  opportunities: Opportunity[],
  selections: Selections,
  budget: UserBudget,
  timing: UserTiming,
): { cards: ResultCard[]; hiddenByFilters: number } {
  const all = rankOpportunities(opportunities, selections).map((match) => {
    const record = match.opportunity.record;
    return {
      match,
      filter: combineFilters(
        timingFilter(timing, record.earliest_project_start_date, record.project_end_date),
        budgetFilter(budget, record.minimum_project_size, record.maximum_project_size),
      ),
    };
  });
  const cards = all.filter((card) => !card.filter.hidden);
  return { cards, hiddenByFilters: all.length - cards.length };
}
