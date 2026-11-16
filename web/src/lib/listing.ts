// The list the results page shows, after its own toolbar: search, the
// "open calls only" switch and the sort order. With a profile the list is the
// ranked results (lib/results.ts); without one it is every opportunity.
// Nothing here changes a match score.

import type { CardFilter, UserBudget, UserTiming } from "./filters.ts";
import { deadlineStatus } from "./format.ts";
import type { Match } from "./match.ts";
import { buildResults } from "./results.ts";
import type { Opportunity, Selections } from "./types.ts";

export type SortKey = "match" | "deadline";
export type ListingOptions = { sort: SortKey; openOnly: boolean; query: string };
export const defaultListingOptions: ListingOptions = { sort: "match", openOnly: false, query: "" };

export type Profile = { selections: Selections; budget: UserBudget; timing: UserTiming };
/** `match` is null when the list is not ranked (browsing every opportunity). */
export type ListingCard = { opportunity: Opportunity; match: Match | null; filter: CardFilter };
export type Listing = {
  cards: ListingCard[];
  /** Cards before the search and the "open calls only" switch. */
  total: number;
  /** Matching opportunities the budget and timing answers rule out. */
  hiddenByFilters: number;
};

const noFilter: CardFilter = { hidden: false, notes: [], warnings: [] };

/** Soonest open deadline first, then calls without a deadline, then closed calls. */
function deadlineOrder(opportunity: Opportunity, today: string) {
  const { pre_submission_deadline: pre, full_proposal_deadline: full } = opportunity.record;
  const status = deadlineStatus(pre, full, today);
  if (status.kind === "open") return `0${status.date}`;
  return status.kind === "none" ? "1" : "2";
}

function matchesQuery(opportunity: Opportunity, query: string) {
  const { display_title, programme, organization_or_parent_framework, call_title } = opportunity.record;
  const text = [display_title, programme, organization_or_parent_framework, call_title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
}

export function buildListing(
  opportunities: Opportunity[],
  profile: Profile | null,
  options: ListingOptions,
  today: string,
): Listing {
  let all: ListingCard[];
  let hiddenByFilters = 0;
  if (profile) {
    const results = buildResults(opportunities, profile.selections, profile.budget, profile.timing);
    hiddenByFilters = results.hiddenByFilters;
    all = results.cards.map(({ match, filter }) => ({ opportunity: match.opportunity, match, filter }));
  } else {
    all = opportunities.map((opportunity) => ({ opportunity, match: null, filter: noFilter }));
  }

  let cards = all.filter((card) => matchesQuery(card.opportunity, options.query));
  if (options.openOnly) {
    cards = cards.filter((card) => deadlineOrder(card.opportunity, today) !== "2");
  }
  // An unranked list has no match order, so it is always by deadline.
  if (options.sort === "deadline" || !profile) {
    const keyed = cards.map((card, index) => ({ card, index, key: deadlineOrder(card.opportunity, today) }));
    keyed.sort(
      (a, b) =>
        a.key.localeCompare(b.key) ||
        (profile
          ? a.index - b.index
          : a.card.opportunity.record.display_title.localeCompare(b.card.opportunity.record.display_title, "en")),
    );
    cards = keyed.map((entry) => entry.card);
  }
  return { cards, total: all.length, hiddenByFilters };
}
