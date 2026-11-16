import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  focusRingClassName,
  ghostControlClassName,
  outlineControlClassName,
  primaryControlClassName,
} from "@/components/styles.ts";
import {
  budgetPresets,
  budgetStops,
  END_YEARS,
  keepEndAfterStart,
  lastBudgetIndex,
  lastEndIndex,
  lastStartIndex,
  presetLabel,
  quarterLabel,
  START_YEARS,
  type Answers,
  type Range,
} from "@/lib/answers.ts";
import { formatAmount } from "@/lib/format.ts";
import { dimensions, type Dimension, type Selections, type Taxonomy } from "@/lib/types.ts";

export type StepKey = Dimension | "budget" | "timing";

export const stepMeta: Record<StepKey, { label: string; title: string }> = {
  topic: { label: "Topic", title: "What’s your project about?" },
  role: { label: "Role", title: "What will TenneT contribute to the project?" },
  activity: { label: "Activity", title: "What work will the project actually perform?" },
  outcome: {
    label: "Outcome",
    title: "What improvement or change will this project deliver for TenneT?",
  },
  budget: { label: "Budget", title: "What is the project's expected total budget?" },
  timing: { label: "Timing", title: "When could the project start?" },
};

// The help example: the InterOPERA project, as taxonomy codes. The labels come
// from the taxonomy file; a code that no longer exists is left out.
const interOperaExample: Selections = {
  topic: ["T4", "T7"],
  role: ["R2", "R8"],
  activity: ["A4", "A6", "A7", "A8", "A13"],
  outcome: ["O7", "O4"],
};

const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
/** The budget stops named under the slider. */
const budgetScaleStops = [0, 5, 10, lastBudgetIndex];

const isDimension = (step: StepKey): step is Dimension => dimensions.includes(step as Dimension);

/** A step can be opened once every question before it has an answer. */
export function reachableSteps(steps: StepKey[], selections: Selections) {
  let open = true;
  return steps.map((step) => {
    const reachable = open;
    if (isDimension(step) && selections[step].length === 0) open = false;
    return reachable;
  });
}

export function Questionnaire({
  taxonomy,
  steps,
  step,
  answers,
  firstYear,
  showDefinitions,
  onShowDefinitions,
  onAnswers,
  onStep,
  onFinish,
  onReset,
}: {
  taxonomy: Taxonomy;
  steps: StepKey[];
  step: number;
  answers: Answers;
  firstYear: number;
  showDefinitions: boolean;
  onShowDefinitions: (show: boolean) => void;
  onAnswers: (answers: Answers) => void;
  onStep: (step: number) => void;
  onFinish: () => void;
  onReset: () => void;
}) {
  const current = steps[step];
  const dimension = isDimension(current) ? current : null;
  const lastStep = step === steps.length - 1;
  const reachable = reachableSteps(steps, answers.selections);
  const selected = dimension ? answers.selections[dimension] : [];
  const canContinue = !dimension || selected.length > 0;
  const title = useRef<HTMLHeadingElement>(null);

  // A new question starts at its title, for keyboards and screen readers too.
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [step]);

  function select(codes: string[]) {
    if (!dimension) return;
    onAnswers({ ...answers, selections: { ...answers.selections, [dimension]: codes } });
  }

  function toggle(code: string) {
    select(selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code]);
  }

  const next = () => (lastStep ? onFinish() : onStep(step + 1));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start gap-3">
        <ol className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((key, index) => {
            const done = index < step && reachable[index];
            const isCurrent = index === step;
            return (
              <li key={key} className="min-w-0">
                <button
                  type="button"
                  disabled={!reachable[index]}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Question ${index + 1} of ${steps.length}: ${stepMeta[key].label}`}
                  onClick={() => onStep(index)}
                  className={`group block w-full rounded-md pb-1 text-left disabled:cursor-not-allowed ${focusRingClassName}`}
                >
                  <span
                    className={`block h-1.5 rounded-full transition-colors ${
                      isCurrent ? "bg-[#2780b8]" : done ? "bg-[#9bccea]" : "bg-[#e0e6eb]"
                    } ${reachable[index] && !isCurrent ? "group-hover:bg-[#5ba5cf]" : ""}`}
                  />
                  <span
                    className={`mt-2 flex items-center gap-1 text-xs leading-[1.3] ${
                      isCurrent
                        ? "font-semibold text-[#164d73]"
                        : reachable[index]
                          ? "font-medium text-[#27313a]"
                          : "font-medium text-[#58636d]"
                    }`}
                  >
                    {done ? (
                      <Check className="size-3 shrink-0 text-[#2780b8]" aria-hidden="true" />
                    ) : (
                      <span className="tabular-nums max-sm:hidden">{index + 1}</span>
                    )}
                    <span className="truncate">{stepMeta[key].label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div key={current} className="screen-enter">
        <div className="mx-auto mt-7 text-center sm:mt-9">
          <h1
            ref={title}
            tabIndex={-1}
            className="mx-auto max-w-3xl text-3xl font-semibold tracking-[-0.035em] outline-none sm:text-4xl"
          >
            {stepMeta[current].title}
          </h1>
        </div>

        {dimension ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums" aria-live="polite">
                  {selected.length} of {taxonomy[dimension].length} selected
                </span>
                <button
                  type="button"
                  disabled={selected.length === taxonomy[dimension].length}
                  onClick={() => select(taxonomy[dimension].map((entry) => entry.code))}
                  className={outlineControlClassName}
                >
                  Select all
                </button>
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => select([])}
                  className={ghostControlClassName}
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ProjectExample taxonomy={taxonomy} dimension={dimension} />
                <Switch checked={showDefinitions} onChange={onShowDefinitions} label="Definitions" />
              </div>
            </div>
            <div className="mt-3 grid items-stretch gap-2.5 sm:grid-cols-2">
              {taxonomy[dimension].map((entry) => {
                const isSelected = selected.includes(entry.code);
                return (
                  <button
                    key={entry.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(entry.code)}
                    className={`flex min-h-[var(--tool-option-height)] w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${focusRingClassName} ${
                      isSelected
                        ? "border-[#82b8dc] bg-[#e7f2fb]"
                        : "border-[#d8dde2] bg-white hover:border-[#aebbc6]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-medium leading-[1.5]">{entry.value}</span>
                      {showDefinitions && entry.definition && (
                        <span className="mt-1 block text-sm leading-[1.45] text-[#58636d]">
                          {entry.definition}
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${
                        isSelected ? "border-[#82b8dc] bg-[#d5eaf8]" : "border-[#cbd1d8] bg-white"
                      }`}
                    >
                      <Check className={`size-3.5 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : current === "budget" ? (
          <RangeCard
            chips={budgetPresets.map((range) => ({
              label: presetLabel(range),
              selected: range[0] === answers.budget[0] && range[1] === answers.budget[1],
              onSelect: () => onAnswers({ ...answers, budget: [range[0], range[1]] }),
            }))}
            range={answers.budget}
            maxIndex={lastBudgetIndex}
            onRangeChange={(budget) => onAnswers({ ...answers, budget })}
            scale={
              <div className="relative mt-1 h-5 text-xs text-[#58636d]">
                {budgetScaleStops.map((stop) => (
                  <span
                    key={stop}
                    className={`absolute top-0 whitespace-nowrap ${
                      stop === 0 ? "" : stop === lastBudgetIndex ? "-translate-x-full" : "-translate-x-1/2"
                    }`}
                    style={{ left: `${(stop / lastBudgetIndex) * 100}%` }}
                  >
                    {formatAmount(budgetStops[stop])}
                    {stop === lastBudgetIndex ? "+" : ""}
                  </span>
                ))}
              </div>
            }
            minLabel="Minimum budget"
            maxLabel="Maximum budget"
            minValue={formatAmount(budgetStops[answers.budget[0]])}
            maxValue={`${formatAmount(budgetStops[answers.budget[1]])}${answers.budget[1] === lastBudgetIndex ? "+" : ""}`}
            ariaLabel="Project budget range"
          />
        ) : (
          <>
            <RangeCard
              range={answers.start}
              maxIndex={lastStartIndex}
              onRangeChange={(start) =>
                onAnswers({
                  ...answers,
                  start,
                  end: answers.end ? keepEndAfterStart(answers.end, start) : null,
                })
              }
              scale={<YearScale firstYear={firstYear} years={START_YEARS} showQuarters />}
              minLabel="Earliest start"
              maxLabel="Latest start"
              minValue={quarterLabel(answers.start[0], firstYear)}
              maxValue={quarterLabel(answers.start[1], firstYear)}
              ariaLabel="Project start window"
            />
            <div className="mx-auto mt-4 flex max-w-2xl items-center justify-between gap-3 px-1">
              <p className="text-base font-medium">
                Also say when the project could end{" "}
                <span className="font-normal text-[#58636d]">(optional)</span>
              </p>
              <Switch
                checked={answers.end !== null}
                label="Add an end window"
                hideLabel
                onChange={(on) =>
                  onAnswers({
                    ...answers,
                    end: on
                      ? keepEndAfterStart(
                          [
                            Math.min(answers.start[1] + 4, lastEndIndex - 1),
                            Math.min(answers.start[1] + 12, lastEndIndex),
                          ],
                          answers.start,
                        )
                      : null,
                  })
                }
              />
            </div>
            {answers.end && (
              <div className="screen-enter">
                <RangeCard
                  heading="When could the project end?"
                  hint="The end window cannot begin before the start window."
                  range={answers.end}
                  maxIndex={lastEndIndex}
                  onRangeChange={(end) => onAnswers({ ...answers, end: keepEndAfterStart(end, answers.start) })}
                  scale={<YearScale firstYear={firstYear} years={END_YEARS} />}
                  minLabel="Earliest end"
                  maxLabel="Latest end"
                  minValue={quarterLabel(answers.end[0], firstYear)}
                  maxValue={quarterLabel(answers.end[1], firstYear)}
                  ariaLabel="Project end window"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Always in reach: the way back, what is still needed, and the way on. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-[#dfe3e8] bg-[#f6f7f9]/95 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => onStep(step - 1)}
              className={ghostControlClassName}
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Back
            </button>
            <button type="button" onClick={onReset} className={`${ghostControlClassName} max-sm:hidden`}>
              Start over
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <p className="min-w-0 text-right text-sm text-[#58636d]" aria-live="polite">
              {dimension
                ? selected.length === 0
                  ? "Select at least one option"
                  : `${selected.length} selected`
                : `Question ${step + 1} of ${steps.length}`}
            </p>
            <button
              type="button"
              disabled={!canContinue}
              onClick={next}
              className={`${primaryControlClassName} min-h-[2.75rem] px-5 text-base`}
            >
              {lastStep ? "Find opportunities" : "Continue"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hideLabel = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-h-[2.25rem] shrink-0 items-center gap-2 rounded-lg px-1.5 text-sm font-medium ${focusRingClassName}`}
    >
      <span
        aria-hidden="true"
        className={`relative h-[1.375rem] w-[2.5rem] shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#2780b8]" : "bg-[#c3ccd4]"
        }`}
      >
        <span
          className={`absolute top-[0.1875rem] left-[0.1875rem] size-[1rem] rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[1.125rem]" : ""
          }`}
        />
      </span>
      {!hideLabel && <span>{label}</span>}
    </button>
  );
}

function ProjectExample({ taxonomy, dimension }: { taxonomy: Taxonomy; dimension: Dimension }) {
  const values = taxonomy[dimension].filter((entry) => interOperaExample[dimension].includes(entry.code));
  if (values.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#286a99] underline decoration-[#9bccea] underline-offset-4 hover:bg-[#e7f2fb] ${focusRingClassName}`}
        >
          <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
          See an example project
        </button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <p className="text-xs font-semibold text-[#58636d]">How another TenneT project answers this</p>
        <h2 className="mt-2 text-base font-semibold text-[#2475a8]">InterOPERA</h2>
        <p className="mt-2 text-[#58636d]">{stepMeta[dimension].label}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {values.map((entry) => (
            <li key={entry.code}>{entry.value}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function YearScale({
  firstYear,
  years,
  showQuarters = false,
}: {
  firstYear: number;
  years: number;
  showQuarters?: boolean;
}) {
  return (
    <div
      className="mt-1 grid text-center text-xs text-[#58636d]"
      style={{ gridTemplateColumns: `repeat(${years}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: years }, (_, index) => (
        <div key={index} className="min-w-0">
          {showQuarters && (
            <div className="grid grid-cols-4">
              {quarters.map((quarter) => (
                <span key={quarter}>{quarter}</span>
              ))}
            </div>
          )}
          <span className="font-semibold">{firstYear + index}</span>
        </div>
      ))}
    </div>
  );
}

function RangeCard({
  heading,
  hint,
  chips,
  range,
  maxIndex,
  onRangeChange,
  scale,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  ariaLabel,
}: {
  heading?: string;
  hint?: string;
  chips?: { label: string; selected: boolean; onSelect: () => void }[];
  range: Range;
  maxIndex: number;
  onRangeChange: (range: Range) => void;
  scale?: ReactNode;
  minLabel: string;
  maxLabel: string;
  minValue: string;
  maxValue: string;
  ariaLabel: string;
}) {
  return (
    <section className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#dce3e9] bg-white p-4 text-left shadow-sm sm:p-6">
      {heading && (
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{heading}</h2>
          {hint && <p className="mt-1 text-sm text-[#58636d]">{hint}</p>}
        </div>
      )}
      {chips && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#46535e]">Quick ranges</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                aria-pressed={chip.selected}
                onClick={chip.onSelect}
                className={`min-h-[2.25rem] rounded-lg border px-2 py-1.5 text-center text-sm font-semibold transition-colors ${focusRingClassName} ${
                  chip.selected
                    ? "border-[#70afd3] bg-[#dceefa] text-[#164d73]"
                    : "border-[#e0e5e9] bg-[#f5f7f9] text-[#27313a] hover:bg-[#eaf1f6]"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-2 sm:px-3">
        <Slider
          className="preference-slider"
          aria-label={ariaLabel}
          min={0}
          max={maxIndex}
          step={1}
          minStepsBetweenThumbs={1}
          value={range}
          onValueChange={(values) => onRangeChange([values[0] ?? range[0], values[1] ?? range[1]])}
        />
        {scale}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-[#d3d9df] bg-white px-3 py-2.5">
          <p className="text-sm font-semibold text-[#58636d]">{minLabel}</p>
          <p className="mt-1 break-words text-base font-semibold tracking-[-0.02em] sm:text-lg">{minValue}</p>
        </div>
        <div className="rounded-lg border border-[#d3d9df] bg-white px-3 py-2.5 text-right">
          <p className="text-sm font-semibold text-[#58636d]">{maxLabel}</p>
          <p className="mt-1 break-words text-base font-semibold tracking-[-0.02em] sm:text-lg">{maxValue}</p>
        </div>
      </div>
    </section>
  );
}
