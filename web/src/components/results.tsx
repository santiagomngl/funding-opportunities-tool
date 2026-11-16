import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CircleHelp, Info, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CallTypeFilter } from "@/components/call-type-filter.tsx";
import { CallTypeTags } from "@/components/call-type-tags.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { definitionTooltipClassName } from "@/components/styles.ts";
import { applyCallTypeFilter, countOptions } from "@/lib/call-type-filter.ts";
import type { UserBudget, UserTiming } from "@/lib/filters.ts";
import {
  allDeadlinesPassed,
  formatProjectSize,
  formatProjectWindow,
  formatSubmissionWindow,
  localToday,
} from "@/lib/format.ts";
import { percentage } from "@/lib/match.ts";
import { buildResults } from "@/lib/results.ts";
import {
  dimensions,
  type CallTypeGroup,
  type Dimension,
  type Opportunity,
  type Selections,
  type Taxonomy,
} from "@/lib/types.ts";

const factLabelClassName = "text-xs font-bold uppercase tracking-[0.06em] text-[#164d73]";
const factValueClassName = "mt-1.5 text-sm leading-[1.45] text-[#58636d]";

export function Results({
  opportunities,
  taxonomy,
  callTypes,
  selections,
  budget,
  timing,
  profileSummary,
  dimensionLabels,
  onEdit,
  onReset,
  onSelect,
}: {
  opportunities: Opportunity[];
  taxonomy: Taxonomy;
  callTypes: CallTypeGroup[];
  selections: Selections;
  budget: UserBudget;
  timing: UserTiming;
  /** Budget and timing answers, ready to show. */
  profileSummary: string[];
  dimensionLabels: Record<Dimension, { label: string }>;
  onEdit: () => void;
  onReset: () => void;
  onSelect: (id: string) => void;
}) {
  // The ranked cards that fit the budget and timing. The call-type filter comes
  // after them and only hides cards; its state lives here, so it is cleared
  // whenever the user leaves the results (Edit profile, Reset, Start over).
  const { cards: rankedCards, hiddenByFilters } = useMemo(
    () => buildResults(opportunities, selections, budget, timing),
    [opportunities, selections, budget, timing],
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());
  const counts = useMemo(() => countOptions(rankedCards, callTypes), [rankedCards, callTypes]);
  const cards = useMemo(
    () => applyCallTypeFilter(rankedCards, selectedCategories),
    [rankedCards, selectedCategories],
  );
  const clearFilters = () => setSelectedCategories(new Set());
  const today = localToday();
  const totalSelected = dimensions.reduce((total, d) => total + selections[d].length, 0);
  const labelOf = (dimension: Dimension, code: string) =>
    taxonomy[dimension].find((entry) => entry.code === code)?.value ?? "";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe3e8] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Your funding opportunity matches
          </h1>
          <p className="mt-3 text-base leading-[1.5]">
            Explore funding opportunities ranked by their alignment with your project’s selected characteristics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="rounded-lg border-[#d6dbe1] bg-white shadow-none"
          >
            <ArrowLeft /> Edit profile
          </Button>
          <Button type="button" variant="ghost" onClick={onReset} className="rounded-lg">
            <RotateCcw /> Reset
          </Button>
        </div>
      </div>

      <details className="group mt-5 rounded-xl border border-[#dfe3e8] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold marker:content-none">
          <span>Selected profile</span>
          <span>{totalSelected} values</span>
        </summary>
        <div className="flex flex-wrap gap-1.5 border-t border-[#e2e6ea] px-4 py-4">
          {dimensions.flatMap((dimension) =>
            selections[dimension].map((code) => (
              <span
                key={`${dimension}-${code}`}
                className="rounded-full bg-[#eef1f4] px-2.5 py-1 text-xs font-medium"
              >
                <span className="font-semibold">{dimensionLabels[dimension].label} · </span>
                {labelOf(dimension, code)}
              </span>
            )),
          )}
          {profileSummary.map((line) => (
            <span key={line} className="rounded-full bg-[#e7f2fb] px-2.5 py-1 text-xs font-medium">
              {line}
            </span>
          ))}
        </div>
      </details>

      {rankedCards.length > 0 && (
        <>
          <CallTypeFilter
            callTypes={callTypes}
            selected={selectedCategories}
            counts={counts}
            onChange={setSelectedCategories}
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <p role="status" className="text-sm font-medium text-[#58636d]">
              Showing {cards.length} of {rankedCards.length}
            </p>
            <Button
              type="button"
              variant="ghost"
              disabled={selectedCategories.size === 0}
              onClick={clearFilters}
              className="h-8 rounded-lg px-2.5 text-sm"
            >
              Clear filters
            </Button>
          </div>
        </>
      )}

      <TooltipProvider delayDuration={0}>
        <div className="mt-3 space-y-3">
          {cards.map(({ match, filter }) => {
            const record = match.opportunity.record;
            const closed = allDeadlinesPassed(
              record.pre_submission_deadline,
              record.full_proposal_deadline,
              today,
            );

            return (
              <article
                key={record.id}
                className="overflow-hidden rounded-xl border border-[#d7dde2] bg-white transition-colors hover:border-[#80badc] hover:bg-[#f4f9fd]"
              >
                <button
                  type="button"
                  onClick={() => onSelect(record.id)}
                  className="group relative w-full cursor-pointer px-5 pb-16 pt-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9bccea] sm:px-6 sm:pb-6 sm:pr-20"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {record.programme && (
                        <p className="text-sm font-medium leading-[1.45] text-[#58636d]">
                          {record.programme}
                        </p>
                      )}
                      <h2 className="mt-2 text-xl font-semibold uppercase leading-[1.55] tracking-[-0.015em] text-[#164d73] sm:text-2xl sm:leading-[1.35]">
                        {record.display_title}
                      </h2>
                      <CallTypeTags record={record} callTypes={callTypes} className="mt-3" />
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span
                        aria-label={`${percentage(match.score)} match`}
                        className={`shrink-0 rounded-lg px-3 py-2 text-lg font-semibold tabular-nums ${
                          match.score >= 0.5
                            ? "bg-[#e7f5ed] text-[#176b46]"
                            : "bg-[#fbeaea] text-[#a13a3a]"
                        }`}
                      >
                        {percentage(match.score)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            aria-label="How the match percentage is calculated"
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f2f6f9] text-[#5e6973]"
                          >
                            <CircleHelp className="size-5" strokeWidth={1.9} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          sideOffset={4}
                          className={`${definitionTooltipClassName} w-80 max-w-[calc(100vw-2rem)] animate-none text-left font-normal text-wrap [&>svg]:hidden`}
                        >
                          The matching percentage shows how closely a funding opportunity aligns with the project characteristics selected in the questionnaire. Budget and timing do not change it.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-x-7 gap-y-4 border-t border-[#e1e6ea] pt-5 sm:grid-cols-3">
                    <div>
                      <dt className={factLabelClassName}>Project size</dt>
                      <dd className={factValueClassName}>
                        {formatProjectSize(record.minimum_project_size, record.maximum_project_size)}
                      </dd>
                    </div>
                    <div>
                      <dt className={factLabelClassName}>Project window</dt>
                      <dd className={factValueClassName}>
                        {formatProjectWindow(record.earliest_project_start_date, record.project_end_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className={factLabelClassName}>Proposal submission window</dt>
                      <dd className={factValueClassName}>
                        {formatSubmissionWindow(
                          record.pre_submission_deadline,
                          record.full_proposal_deadline,
                        ).map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                        {closed && (
                          <span className="mt-1.5 inline-block rounded-md bg-[#fbeaea] px-2 py-0.5 font-semibold text-[#a13a3a]">
                            The submission deadline has passed
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {(filter.warnings.length > 0 || filter.notes.length > 0) && (
                    <ul className="mt-4 space-y-1.5 text-sm leading-[1.45]">
                      {filter.warnings.map((warning) => (
                        <li
                          key={warning}
                          className="flex items-start gap-2 rounded-lg bg-[#fff4dc] px-3 py-2 font-medium text-[#7a4b00]"
                        >
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <span>{warning}</span>
                        </li>
                      ))}
                      {filter.notes.map((note) => (
                        <li
                          key={note}
                          className="flex items-start gap-2 rounded-lg bg-[#eef6fb] px-3 py-2 text-[#164d73]"
                        >
                          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 grid size-13 place-items-center rounded-tl-[1.65rem] bg-[#164d73] text-white transition-colors group-hover:bg-[#0f638d]"
                  >
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </article>
            );
          })}

          {cards.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#c6ccd2] bg-white px-6 py-14 text-center">
              {rankedCards.length > 0 ? (
                <>
                  <h2 className="text-lg font-semibold">No opportunity matches the selected filters</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                    {rankedCards.length === 1
                      ? "One opportunity matches your project, but it is"
                      : `${rankedCards.length} opportunities match your project, but they are`}{" "}
                    hidden by the filters you ticked.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-5 rounded-lg border-[#d6dbe1] bg-white shadow-none"
                  >
                    Clear filters
                  </Button>
                </>
              ) : opportunities.length === 0 ? (
                <>
                  <h2 className="text-lg font-semibold">No funding opportunities yet</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                    No funding opportunities have been published here yet. Please check back later.
                  </p>
                </>
              ) : hiddenByFilters > 0 ? (
                <>
                  <h2 className="text-lg font-semibold">No opportunity fits your budget and timing</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                    {hiddenByFilters === 1
                      ? "One opportunity matches your project, but it"
                      : `${hiddenByFilters} opportunities match your project, but they`}{" "}
                    cannot fund a project with the budget or timing you gave. Edit the profile to
                    widen them.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">No overlapping opportunities</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                    None of the funding opportunities share a characteristic you selected. Edit the
                    profile to broaden the comparison.
                  </p>
                </>
              )}
            </div>
          )}

          {rankedCards.length > 0 && hiddenByFilters > 0 && (
            <p className="px-1 pt-1 text-sm leading-[1.5] text-[#58636d]">
              {hiddenByFilters === 1
                ? "One more matching opportunity is"
                : `${hiddenByFilters} more matching opportunities are`}{" "}
              not shown, because the call cannot fund a project with the budget or timing you gave.
            </p>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
