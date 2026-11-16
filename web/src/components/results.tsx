import type { MouseEvent } from "react";
import {
  ArrowRight,
  CalendarRange,
  ChevronRight,
  CircleHelp,
  Clock,
  Coins,
  Info,
  Pencil,
  RotateCcw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { CallTypeTags } from "@/components/call-type-tags.tsx";
import { DeadlineBadge, MatchRing } from "@/components/facts.tsx";
import { Switch, stepMeta, type StepKey } from "@/components/questionnaire.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  focusRingClassName,
  ghostControlClassName,
  outlineControlClassName,
  primaryControlClassName,
} from "@/components/styles.ts";
import { budgetLabel, quarterLabel, type Answers } from "@/lib/answers.ts";
import {
  deadlineStatus,
  formatProjectSize,
  formatProjectWindow,
  formatSubmissionWindow,
  splitTitle,
} from "@/lib/format.ts";
import type { Listing, ListingCard, ListingOptions, SortKey } from "@/lib/listing.ts";
import {
  dimensions,
  type CallTypeGroup,
  type Dimension,
  type Taxonomy,
} from "@/lib/types.ts";

/** How many matched answers a card names before "+N". */
const MATCH_CHIPS = 3;

export function Results({
  listing,
  ranked,
  options,
  onOptions,
  published,
  taxonomy,
  callTypes,
  answers,
  steps,
  firstYear,
  today,
  hrefFor,
  onOpen,
  onEditStep,
  onStart,
  onReset,
}: {
  listing: Listing;
  /** False when every opportunity is listed, without a questionnaire. */
  ranked: boolean;
  options: ListingOptions;
  onOptions: (options: ListingOptions) => void;
  /** How many opportunities the site holds at all. */
  published: number;
  taxonomy: Taxonomy;
  callTypes: CallTypeGroup[];
  answers: Answers;
  steps: StepKey[];
  firstYear: number;
  today: string;
  hrefFor: (id: string) => string;
  onOpen: (id: string) => void;
  onEditStep: (step: number) => void;
  onStart: () => void;
  onReset: () => void;
}) {
  const { cards, total, hiddenByFilters } = listing;
  const narrowed = options.query.trim() !== "" || options.openOnly;
  const labelOf = (dimension: Dimension, code: string) =>
    taxonomy[dimension].find((entry) => entry.code === code)?.value ?? "";

  const stepValue = (step: StepKey) => {
    if (step === "budget") return budgetLabel(answers.budget);
    if (step === "timing") {
      const start = `${quarterLabel(answers.start[0], firstYear)} – ${quarterLabel(answers.start[1], firstYear)}`;
      return answers.end
        ? `${start}, end ${quarterLabel(answers.end[0], firstYear)} – ${quarterLabel(answers.end[1], firstYear)}`
        : start;
    }
    return String(answers.selections[step].length);
  };
  const stepTitle = (step: StepKey) =>
    step === "budget" || step === "timing"
      ? `Change ${stepMeta[step].label.toLowerCase()}`
      : `Change ${stepMeta[step].label.toLowerCase()}: ${answers.selections[step].map((code) => labelOf(step, code)).join(", ")}`;

  return (
    <div className="screen-enter mx-auto max-w-6xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {ranked ? "Your funding opportunity matches" : "All funding opportunities"}
        </h1>
        <p className="mt-2 text-base leading-[1.5] text-[#58636d]">
          {ranked
            ? "Ranked by how closely each call fits the project you described."
            : "Every call on the desk, soonest deadline first."}
        </p>
      </div>

      {ranked ? (
        // The answers stay in view; each one opens its own question.
        <div className="sticky top-[var(--header-h)] z-20 -mx-4 mt-4 border-b border-[#dfe3e8] bg-[#f6f7f9]/95 px-4 py-2 backdrop-blur sm:-mx-7 sm:px-7">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-bold uppercase tracking-[0.06em] text-[#164d73] max-sm:sr-only">
              Your project
            </span>
            <ul className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 py-0.5 max-sm:overflow-x-auto sm:flex-wrap">
              {steps.map((step, index) => (
                <li key={step} className="shrink-0">
                  <button
                    type="button"
                    title={stepTitle(step)}
                    aria-label={stepTitle(step)}
                    onClick={() => onEditStep(index)}
                    className={`group inline-flex min-h-[2rem] items-center gap-1.5 rounded-full border border-[#d6dbe1] bg-white px-3 text-xs font-medium whitespace-nowrap transition-colors hover:border-[#82b8dc] hover:bg-[#e7f2fb] ${focusRingClassName}`}
                  >
                    <span className="font-semibold text-[#164d73]">{stepMeta[step].label}</span>
                    <span>{stepValue(step)}</span>
                    <Pencil className="size-3 text-[#58636d] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onReset} className={`${ghostControlClassName} shrink-0 px-2`}>
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">Start over</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c9ddea] bg-[#f4f9fd] px-4 py-3">
          <p className="text-sm leading-[1.45]">
            Answer {steps.length} questions about your project to rank these calls by fit.
          </p>
          <button type="button" onClick={onStart} className={primaryControlClassName}>
            Rank them for my project <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="order-1 mr-auto text-sm font-semibold" aria-live="polite">
            {narrowed ? `${cards.length} of ${total}` : total}{" "}
            {ranked ? (total === 1 ? "match" : "matches") : total === 1 ? "opportunity" : "opportunities"}
          </p>
          <label className="relative order-3 block w-full sm:w-[17rem]">
            <span className="sr-only">Search the list</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#58636d]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={options.query}
              onChange={(event) => onOptions({ ...options, query: event.target.value })}
              placeholder="Search titles or call IDs"
              className={`min-h-[2.25rem] w-full rounded-lg border border-[#d6dbe1] bg-white pr-3 pl-9 text-sm placeholder:text-[#6b7781] ${focusRingClassName}`}
            />
          </label>
          {ranked && (
            <label className="order-4 flex items-center gap-2 text-sm font-medium">
              <span className="text-[#58636d]">Sort</span>
              <select
                value={options.sort}
                onChange={(event) => onOptions({ ...options, sort: event.target.value as SortKey })}
                className={`min-h-[2.25rem] rounded-lg border border-[#d6dbe1] bg-white px-2 text-sm font-medium ${focusRingClassName}`}
              >
                <option value="match">Best match</option>
                <option value="deadline">Deadline soonest</option>
              </select>
            </label>
          )}
          <span className="order-5 inline-flex">
            <Switch
              checked={options.openOnly}
              onChange={(openOnly) => onOptions({ ...options, openOnly })}
              label="Open calls only"
            />
          </span>
          {ranked && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={`${ghostControlClassName} order-2 px-2 text-[#286a99] sm:order-6`}>
                  <CircleHelp className="size-4" aria-hidden="true" />
                  How matching works
                </button>
              </PopoverTrigger>
              <PopoverContent align="end">
                The matching percentage shows how closely a funding opportunity aligns with the project
                characteristics selected in the questionnaire. Budget and timing do not change it.
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      <ul className="mt-3 space-y-2.5">
        {cards.map((card) => (
          <li key={card.opportunity.record.id}>
            <ResultCard
              card={card}
              callTypes={callTypes}
              today={today}
              href={hrefFor(card.opportunity.record.id)}
              onOpen={onOpen}
              labelOf={labelOf}
            />
          </li>
        ))}
      </ul>

      {cards.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-[#c6ccd2] bg-white px-6 py-14 text-center">
          {published === 0 ? (
            <>
              <h2 className="text-lg font-semibold">No funding opportunities yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                No funding opportunities have been published here yet. Please check back later.
              </p>
            </>
          ) : total > 0 ? (
            <>
              <h2 className="text-lg font-semibold">Nothing fits this search</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                None of the {total} {ranked ? "matches" : "opportunities"} fit the search
                {options.openOnly ? " among the open calls" : ""}.
              </p>
              <button
                type="button"
                onClick={() => onOptions({ ...options, query: "", openOnly: false })}
                className={`${outlineControlClassName} mt-4`}
              >
                <X className="size-4" aria-hidden="true" /> Clear search and filter
              </button>
            </>
          ) : hiddenByFilters > 0 ? (
            <>
              <h2 className="text-lg font-semibold">No opportunity fits your budget and timing</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                {hiddenByFilters === 1
                  ? "One opportunity matches your project, but it"
                  : `${hiddenByFilters} opportunities match your project, but they`}{" "}
                cannot fund a project with the budget or timing you gave. Change them in the bar above.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">No overlapping opportunities</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
                None of the funding opportunities share a characteristic you selected. Change your
                answers in the bar above to broaden the comparison.
              </p>
            </>
          )}
        </div>
      )}

      {cards.length > 0 && hiddenByFilters > 0 && (
        <p className="px-1 pt-3 text-sm leading-[1.5] text-[#58636d]">
          {hiddenByFilters === 1
            ? "One more matching opportunity is"
            : `${hiddenByFilters} more matching opportunities are`}{" "}
          not shown, because the call cannot fund a project with the budget or timing you gave.
        </p>
      )}
    </div>
  );
}

function ResultCard({
  card,
  callTypes,
  today,
  href,
  onOpen,
  labelOf,
}: {
  card: ListingCard;
  callTypes: CallTypeGroup[];
  today: string;
  href: string;
  onOpen: (id: string) => void;
  labelOf: (dimension: Dimension, code: string) => string;
}) {
  const { match, filter } = card;
  const record = card.opportunity.record;
  const { callId, title } = splitTitle(record.display_title, record.programme);
  const status = deadlineStatus(record.pre_submission_deadline, record.full_proposal_deadline, today);
  const hasWindow = record.earliest_project_start_date !== null || record.project_end_date !== null;
  const hasSize = record.minimum_project_size !== null || record.maximum_project_size !== null;
  const matched = match
    ? dimensions.flatMap((dimension) => match.matches[dimension].map((code) => labelOf(dimension, code)))
    : [];

  // A real link, so it can be opened in a new tab; a plain click stays in the page.
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(record.id);
  }

  return (
    <a
      href={href}
      onClick={open}
      className={`group flex items-center gap-3 rounded-xl border border-[#d7dde2] bg-white px-4 py-3.5 transition-colors hover:border-[#80badc] hover:bg-[#f4f9fd] sm:gap-4 sm:px-5 ${focusRingClassName} ${
        status.kind === "closed" ? "opacity-75" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs leading-[1.5] text-[#58636d]">
          {callId && <span className="font-mono font-semibold tracking-[-0.01em] text-[#164d73]">{callId}</span>}
          {record.programme && <span className="font-medium">{record.programme}</span>}
        </p>
        <h2 className="mt-0.5 text-lg font-semibold leading-[1.35] tracking-[-0.015em] text-[#164d73]">
          {title}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm leading-[1.45] text-[#27313a]">
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <Clock className="size-4 shrink-0 text-[#58636d]" aria-hidden="true" />
            <DeadlineBadge status={status} />
            <span className="text-[#58636d]">
              {formatSubmissionWindow(record.pre_submission_deadline, record.full_proposal_deadline).join(" · ")}
            </span>
          </span>
          {hasWindow && (
            <span className="inline-flex items-center gap-2 text-[#58636d]">
              <CalendarRange className="size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">Project window: </span>
                {formatProjectWindow(record.earliest_project_start_date, record.project_end_date)}
              </span>
            </span>
          )}
          {hasSize && (
            <span className="inline-flex items-center gap-2 text-[#58636d]">
              <Coins className="size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">Project size: </span>
                {formatProjectSize(record.minimum_project_size, record.maximum_project_size)}
              </span>
            </span>
          )}
        </div>

        <CallTypeTags record={record} callTypes={callTypes} className="mt-2" />

        {matched.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs leading-[1.4]">
            <span className="font-semibold text-[#164d73]">Matches</span>
            {matched.slice(0, MATCH_CHIPS).map((label) => (
              <span key={label} className="rounded-full bg-[#e7f2fb] px-2 py-0.5 font-medium">
                {label}
              </span>
            ))}
            {matched.length > MATCH_CHIPS && (
              <span
                title={matched.slice(MATCH_CHIPS).join(", ")}
                className="rounded-full bg-[#eef1f4] px-2 py-0.5 font-medium"
              >
                +{matched.length - MATCH_CHIPS}
              </span>
            )}
          </p>
        )}

        {(filter.warnings.length > 0 || filter.notes.length > 0) && (
          <ul className="mt-2 space-y-1 text-sm leading-[1.45]">
            {filter.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 font-medium text-[#7a4b00]">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{warning}</span>
              </li>
            ))}
            {filter.notes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-[#164d73]">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-start sm:gap-2 sm:self-center">
        {match && <MatchRing score={match.score} />}
        <ChevronRight
          className="size-5 text-[#58636d] transition-transform group-hover:translate-x-0.5 group-hover:text-[#164d73] max-sm:hidden"
          aria-hidden="true"
        />
      </div>
    </a>
  );
}
