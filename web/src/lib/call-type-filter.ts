// The call-type filter of the results page.
//
// The state is a set of selected category codes (never shown). The filter only
// hides cards: it never changes a score or the order, and it knows nothing of
// the budget and timing rules (filters.ts). Pure functions; nothing is stored.

import type { CallTypeGroup, FoRecord } from "./types.ts";

export type CallTypeSelection = ReadonlySet<string>;
type HasRecord = { match: { opportunity: { record: Pick<FoRecord, "category_codes"> } } };

const codesOf = (card: HasRecord) => card.match.opportunity.record.category_codes;

/** A card passes when no category is selected, or when at least one of its codes is selected. */
export function passesCallTypeFilter(categoryCodes: string[], selected: CallTypeSelection) {
  return selected.size === 0 || categoryCodes.some((code) => selected.has(code));
}

/** The cards that pass, in the order they came in. */
export function applyCallTypeFilter<Card extends HasRecord>(cards: Card[], selected: CallTypeSelection): Card[] {
  return cards.filter((card) => passesCallTypeFilter(codesOf(card), selected));
}

export type OptionCounts = {
  /** Per call type: the cards that hold at least one of its categories. */
  byType: Record<string, number>;
  /** Per category code: the cards that hold it. */
  byCategory: Record<string, number>;
};

/**
 * How many cards match each filter option. Give it the cards before the
 * call-type filter, so the numbers do not move while the user ticks boxes.
 */
export function countOptions(cards: HasRecord[], callTypes: CallTypeGroup[]): OptionCounts {
  const byType: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const group of callTypes) {
    const codes = group.categories.map((category) => category.code);
    byType[group.type] = cards.filter((card) => codesOf(card).some((code) => codes.includes(code))).length;
    for (const code of codes) {
      byCategory[code] = cards.filter((card) => codesOf(card).includes(code)).length;
    }
  }
  return { byType, byCategory };
}

export function toggleCategory(selected: CallTypeSelection, code: string): Set<string> {
  const next = new Set(selected);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  return next;
}

/** Whether all, some or none of a type's categories are selected. */
export function typeState(selected: CallTypeSelection, group: CallTypeGroup): "all" | "some" | "none" {
  const on = group.categories.filter((category) => selected.has(category.code)).length;
  if (on === 0) return "none";
  return on === group.categories.length ? "all" : "some";
}

/** Ticking a type's heading selects all its categories; when all are on, it clears them. */
export function toggleType(selected: CallTypeSelection, group: CallTypeGroup): Set<string> {
  const next = new Set(selected);
  const clear = typeState(selected, group) === "all";
  for (const { code } of group.categories) {
    if (clear) next.delete(code);
    else next.add(code);
  }
  return next;
}
