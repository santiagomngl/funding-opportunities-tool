import { useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Maximize2, Minimize2 } from "lucide-react";
import siteData from "virtual:funding-data";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { OpportunitySheet } from "@/components/detail-view.tsx";
import { definitionTooltipClassName } from "@/components/styles.ts";
import { Results } from "@/components/results.tsx";
import { quarterEnd, quarterStart, type UserBudget, type UserTiming } from "@/lib/filters.ts";
import { formatAmount } from "@/lib/format.ts";
import { dimensions, type Dimension, type Selections } from "@/lib/types.ts";

const { taxonomy, callTypes, opportunities } = siteData;

type QuestionnaireStep = Dimension | "budget" | "timing";

const dimensionMeta: Record<Dimension, { label: string; title: string }> = {
  topic: { label: "Topic", title: "What’s your project about?" },
  role: { label: "Role", title: "What will TenneT contribute to the project?" },
  activity: { label: "Activity", title: "What work will the project actually perform?" },
  outcome: {
    label: "Outcome",
    title: "What improvement or change will this project deliver for TenneT?",
  },
};

const preferenceMeta: Record<"budget" | "timing", { label: string; title: string }> = {
  budget: { label: "Budget / Project Size", title: "What is the project's expected total budget?" },
  timing: { label: "Project Timing", title: "When could the project start?" },
};

// A dimension without options (a broken taxonomy file) is left out, so the
// questionnaire can always be completed.
const questionnaireSteps: QuestionnaireStep[] = [
  ...dimensions.filter((dimension) => taxonomy[dimension].length > 0),
  "budget",
  "timing",
];

// The help example: the InterOPERA project, as taxonomy codes. The labels come
// from the taxonomy file; a code that no longer exists is left out.
const interOperaExample: Selections = {
  topic: ["T4", "T7"],
  role: ["R2", "R8"],
  activity: ["A4", "A6", "A7", "A8", "A13"],
  outcome: ["O7", "O4"],
};

const budgetStops = [
  10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  10_000_000, 25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000, 1_000_000_000,
] as const;

const budgetPresets = [
  { label: "€10k–€100k", range: [0, 3] as [number, number] },
  { label: "€100k–€1m", range: [3, 6] as [number, number] },
  { label: "€1m–€5m", range: [6, 8] as [number, number] },
  { label: "€5m–€25m", range: [8, 10] as [number, number] },
  { label: "€25m–€100m", range: [10, 12] as [number, number] },
  { label: "€100m–€1,000m+", range: [12, 15] as [number, number] },
] as const;

// Timing sliders move in quarters. The start slider covers this year and the
// four after it; the optional end slider covers this year and the nine after it.
const firstYear = new Date().getFullYear();
const START_YEARS = 5;
const END_YEARS = 10;
const startYears = Array.from({ length: START_YEARS }, (_, i) => firstYear + i);
const endYears = Array.from({ length: END_YEARS }, (_, i) => firstYear + i);
const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
const lastStartIndex = START_YEARS * 4 - 1;
const lastEndIndex = END_YEARS * 4 - 1;

const quarterOf = (index: number) => ({ year: firstYear + Math.floor(index / 4), quarter: (index % 4) + 1 });
function quarterLabel(index: number) {
  const { year, quarter } = quarterOf(index);
  return `Q${quarter} ${year}`;
}

function budgetLabel(range: [number, number]) {
  const top = range[1] === budgetStops.length - 1;
  return `${formatAmount(budgetStops[range[0]])} – ${formatAmount(budgetStops[range[1]])}${top ? "+" : ""}`;
}

const emptySelections: Selections = { topic: [], role: [], activity: [], outcome: [] };
const defaultBudgetRange: [number, number] = [2, 8];
const defaultStartRange: [number, number] = [6, 10];

function opportunityIdFromHash() {
  const id = new URLSearchParams(window.location.hash.slice(1)).get("opportunity");
  return id && opportunities.some((o) => o.record.id === id) ? id : null;
}

function TaxonomyValueOption({
  label,
  description,
  selected,
  onToggle,
}: {
  label: string;
  description: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  const showDescription = open && description !== "";

  return (
    <div
      className={`relative min-w-0 ${open ? "z-20" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-describedby={showDescription ? descriptionId : undefined}
        onClick={onToggle}
        className={`group flex min-h-[var(--tool-option-height)] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea] ${
          selected
            ? "border-[#82b8dc] bg-[#e7f2fb]"
            : "border-[#d8dde2] bg-white hover:border-[#aebbc6]"
        }`}
      >
        <span className="text-base font-medium leading-[1.5]">{label}</span>
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-full border ${
            selected ? "border-[#82b8dc] bg-[#d5eaf8]" : "border-[#cbd1d8] bg-white"
          }`}
        >
          <Check className={`size-3.5 ${selected ? "opacity-100" : "opacity-0"}`} />
        </span>
      </button>
      {showDescription && (
        <div className="absolute bottom-full left-0 z-40 w-full max-w-96 pb-1">
          <div id={descriptionId} role="tooltip" className={definitionTooltipClassName}>
            {description}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectExamplesHelp({ dimension }: { dimension: Dimension }) {
  const [open, setOpen] = useState(false);
  const values = taxonomy[dimension].filter((entry) =>
    interOperaExample[dimension].includes(entry.code),
  );
  if (values.length === 0) return null;

  return (
    <div
      className="relative z-30 w-fit max-w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="project-examples-panel"
        onClick={() => setOpen(true)}
        className="flex max-w-full items-center gap-2 rounded-lg border border-[#c9ddea] bg-white px-3 py-2 text-left text-sm font-medium text-[#286a99] shadow-sm hover:bg-[#f5faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
      >
        <span>How do other projects fit into this?</span>
        <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div
          id="project-examples-panel"
          className="absolute left-0 top-full z-40 w-[min(var(--tool-examples-width),calc(100vw-2rem))] max-h-[min(32rem,calc(100vh-8rem))] overflow-y-auto rounded-xl border border-[#d5e3ee] bg-white p-4 shadow-[0_12px_32px_rgba(24,60,90,0.16)] sm:p-5"
        >
          <p className="text-xs font-semibold text-[#27313a]">Example from TenneT</p>
          <div className="mt-3 min-w-0">
            <h2 className="text-base font-semibold text-[#2475a8]">InterOPERA</h2>
            <dl className="mt-2 text-[13px] leading-[1.5]">
              <dt className="text-[#64788b]">{dimensionMeta[dimension].label}</dt>
              <dd className="mt-1 min-w-0 text-[#27313a]">
                <ul className="list-disc space-y-1 pl-5">
                  {values.map((entry) => (
                    <li key={entry.code}>{entry.value}</li>
                  ))}
                </ul>
              </dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"intro" | "profile" | "results">("intro");
  const [selections, setSelections] = useState<Selections>(emptySelections);
  const [budgetRange, setBudgetRange] = useState<[number, number]>(defaultBudgetRange);
  const [budgetPreset, setBudgetPreset] = useState<string | null>(null);
  const [startRange, setStartRange] = useState<[number, number]>(defaultStartRange);
  const [endRange, setEndRange] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(opportunityIdFromHash);
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCanUseFullscreen(document.fullscreenEnabled);
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const syncHash = () => setSelectedId(opportunityIdFromHash());

    document.addEventListener("fullscreenchange", syncFullscreenState);
    window.addEventListener("hashchange", syncHash);
    syncFullscreenState();
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  // The address bar follows the open opportunity, so the page can be shared.
  function selectOpportunity(id: string | null) {
    setSelectedId(id);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${id ? `#opportunity=${id}` : ""}`);
  }

  const currentStep = questionnaireSteps[step];
  const currentDimension = dimensions.find((dimension) => dimension === currentStep) ?? null;
  const currentMeta = currentDimension
    ? dimensionMeta[currentDimension]
    : preferenceMeta[currentStep as "budget" | "timing"];
  const lastStep = step === questionnaireSteps.length - 1;

  const budget: UserBudget = useMemo(
    () => ({
      b1: budgetStops[budgetRange[0]],
      // The top of the slider ("+") means no upper limit.
      b2: budgetRange[1] === budgetStops.length - 1 ? null : budgetStops[budgetRange[1]],
    }),
    [budgetRange],
  );

  // Quarters become dates by the best case: a range starts on the first day of
  // its first quarter and ends on the last day of its last quarter.
  const timing: UserTiming = useMemo(() => {
    const from = (index: number) => quarterStart(quarterOf(index).year, quarterOf(index).quarter);
    const to = (index: number) => quarterEnd(quarterOf(index).year, quarterOf(index).quarter);
    return {
      s1: from(startRange[0]),
      s2: to(startRange[1]),
      e1: endRange ? from(endRange[0]) : null,
      e2: endRange ? to(endRange[1]) : null,
    };
  }, [startRange, endRange]);

  // The end range cannot begin before the start range.
  function keepEndAfterStart(end: [number, number], start: [number, number]): [number, number] {
    const first = Math.min(Math.max(end[0], start[0]), lastEndIndex - 1);
    return [first, Math.max(end[1], first + 1)];
  }

  function changeStartRange(range: [number, number]) {
    setStartRange(range);
    setEndRange((current) => (current ? keepEndAfterStart(current, range) : current));
  }

  function toggleEndRange() {
    setEndRange((current) =>
      current
        ? null
        : keepEndAfterStart(
            [Math.min(startRange[1] + 4, lastEndIndex - 1), Math.min(startRange[1] + 12, lastEndIndex)],
            startRange,
          ),
    );
  }

  function toggleValue(dimension: Dimension, code: string) {
    setSelections((current) => ({
      ...current,
      [dimension]: current[dimension].includes(code)
        ? current[dimension].filter((item) => item !== code)
        : [...current[dimension], code],
    }));
  }

  function resetProfile() {
    setSelections(emptySelections);
    setBudgetRange(defaultBudgetRange);
    setBudgetPreset(null);
    setStartRange(defaultStartRange);
    setEndRange(null);
    setStep(0);
    setMode("intro");
    selectOpportunity(null);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Full-screen requests can be blocked by browser or presentation policy.
    }
  }

  const profileSummary = [
    `Budget · ${budgetLabel(budgetRange)}`,
    `Start · ${quarterLabel(startRange[0])} – ${quarterLabel(startRange[1])}`,
    ...(endRange ? [`End · ${quarterLabel(endRange[0])} – ${quarterLabel(endRange[1])}`] : []),
  ];

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#27313a]">
      <header className="bg-[#f6f7f9]">
        <div className="mx-auto flex min-h-24 max-w-[var(--tool-header-width)] items-center gap-3 px-4 py-4 sm:gap-4 sm:px-7">
          <img
            src="/innovation-funding-desk-logo.png"
            alt="Innovation Funding Desk logo"
            width={778}
            height={771}
            className="h-16 w-auto shrink-0 object-contain sm:h-20"
          />
          <p className="desk-brand-title min-w-0 text-xl font-extrabold leading-tight tracking-[-0.035em] sm:text-3xl">
            Innovation Funding Desk
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!canUseFullscreen}
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            aria-pressed={isFullscreen}
            onClick={toggleFullscreen}
            className="ml-auto h-9 w-9 shrink-0 rounded-lg border-[#d6dbe1] bg-white p-0 text-sm shadow-none hover:bg-[#f4f8fb] disabled:hidden"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[var(--tool-content-width)] px-4 py-6 sm:px-7 sm:py-8">
        <section className="min-w-0">
          {mode === "intro" ? (
            <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-12 text-center">
              <div className="max-w-full">
                <span className="inline-flex rounded-full border border-[#9bccea] bg-[#f7fbfe] px-4 py-1.5 text-sm font-semibold">
                  {questionnaireSteps.length} questions
                </span>
                <h1 className="landing-title mx-auto mt-7 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  How does your innovation look like?
                </h1>
                <p className="mx-auto mt-5 text-lg leading-[1.35]">
                  Define the characteristics — we’ll rank in seconds the funding opportunities that match them.
                </p>
                <Button
                  type="button"
                  onClick={() => setMode("profile")}
                  className="mt-9 h-14 rounded-xl bg-[#d8ecf9] px-7 text-base font-semibold shadow-none hover:bg-[#cce5f5]"
                >
                  Start <ArrowRight />
                </Button>
                {opportunities.length === 0 && (
                  <p className="mx-auto mt-6 max-w-md text-sm leading-[1.5] text-[#58636d]">
                    No funding opportunities have been published here yet. You can still try the
                    questionnaire.
                  </p>
                )}
              </div>
            </div>
          ) : mode === "profile" ? (
            <div className="mx-auto max-w-5xl pb-8">
              {currentDimension && (
                <div className="mb-5">
                  <ProjectExamplesHelp dimension={currentDimension} />
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span>
                    Question {step + 1} of {questionnaireSteps.length}
                  </span>
                  <span className="border-l border-[#cbd7e0] pl-3 font-semibold text-[#164d73]">
                    {currentMeta.label}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={resetProfile}
                  className="rounded-md px-2 py-1 underline decoration-[#9bccea] underline-offset-4"
                >
                  Start over
                </button>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8ebef]"
                role="progressbar"
                aria-label="Questionnaire progress"
                aria-valuemin={0}
                aria-valuemax={questionnaireSteps.length - 1}
                aria-valuenow={step}
              >
                <div
                  className="h-full rounded-full bg-[#2780b8] transition-[width] duration-300"
                  style={{ width: `${(step / (questionnaireSteps.length - 1)) * 100}%` }}
                />
              </div>

              <div className="mx-auto mt-8 text-center sm:mt-10">
                <h1 className="mx-auto max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  {currentMeta.title}
                </h1>
                {currentDimension && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        selections[currentDimension].length === taxonomy[currentDimension].length
                      }
                      onClick={() =>
                        setSelections((current) => ({
                          ...current,
                          [currentDimension]: taxonomy[currentDimension].map((entry) => entry.code),
                        }))
                      }
                      className="h-9 rounded-lg border-[#d6dbe1] bg-white px-3 text-sm shadow-none disabled:bg-[#f0f2f4]"
                    >
                      {selections[currentDimension].length === taxonomy[currentDimension].length
                        ? "All selected"
                        : "Select all"}
                    </Button>
                    {selections[currentDimension].length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSelections((current) => ({ ...current, [currentDimension]: [] }))
                        }
                        className="h-9 rounded-lg px-3 text-sm"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {currentDimension ? (
                <div className="mt-6 grid items-start gap-2.5 sm:grid-cols-2">
                  {taxonomy[currentDimension].map((entry) => (
                    <TaxonomyValueOption
                      key={entry.code}
                      label={entry.value}
                      description={entry.definition}
                      selected={selections[currentDimension].includes(entry.code)}
                      onToggle={() => toggleValue(currentDimension, entry.code)}
                    />
                  ))}
                </div>
              ) : currentStep === "budget" ? (
                <PreferenceRangeCard
                  chips={budgetPresets.map((item) => item.label)}
                  selectedChip={budgetPreset}
                  onChipSelect={(label) => {
                    const preset = budgetPresets.find((item) => item.label === label);
                    if (!preset) return;
                    setBudgetPreset(preset.label);
                    setBudgetRange([...preset.range]);
                  }}
                  range={budgetRange}
                  maxIndex={budgetStops.length - 1}
                  onRangeChange={(range) => {
                    setBudgetRange(range);
                    setBudgetPreset(null);
                  }}
                  minLabel="Minimum budget"
                  maxLabel="Maximum budget"
                  minValue={formatAmount(budgetStops[budgetRange[0]])}
                  maxValue={`${formatAmount(budgetStops[budgetRange[1]])}${budgetRange[1] === budgetStops.length - 1 ? "+" : ""}`}
                  ariaLabel="Project budget range"
                />
              ) : (
                <>
                  <PreferenceRangeCard
                    range={startRange}
                    maxIndex={lastStartIndex}
                    onRangeChange={changeStartRange}
                    scaleYears={startYears}
                    showQuarters
                    minLabel="Earliest start"
                    maxLabel="Latest start"
                    minValue={quarterLabel(startRange[0])}
                    maxValue={quarterLabel(startRange[1])}
                    ariaLabel="Project start window"
                  />
                  <div className="mx-auto mt-4 max-w-2xl">
                    <button
                      type="button"
                      aria-pressed={endRange !== null}
                      onClick={toggleEndRange}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea] ${
                        endRange
                          ? "border-[#82b8dc] bg-[#e7f2fb]"
                          : "border-[#d8dde2] bg-white hover:border-[#aebbc6]"
                      }`}
                    >
                      <span>
                        Also say when the project could end{" "}
                        <span className="font-normal text-[#58636d]">(optional)</span>
                      </span>
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                          endRange ? "border-[#82b8dc] bg-[#d5eaf8]" : "border-[#cbd1d8] bg-white"
                        }`}
                      >
                        <Check className={`size-3.5 ${endRange ? "opacity-100" : "opacity-0"}`} />
                      </span>
                    </button>
                  </div>
                  {endRange && (
                    <PreferenceRangeCard
                      heading="When could the project end?"
                      hint="The end window cannot begin before the start window."
                      range={endRange}
                      maxIndex={lastEndIndex}
                      onRangeChange={(range) => setEndRange(keepEndAfterStart(range, startRange))}
                      scaleYears={endYears}
                      minLabel="Earliest end"
                      maxLabel="Latest end"
                      minValue={quarterLabel(endRange[0])}
                      maxValue={quarterLabel(endRange[1])}
                      ariaLabel="Project end window"
                    />
                  )}
                </>
              )}

              <div className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="h-11 rounded-lg px-3 text-base"
                >
                  <ArrowLeft /> Back
                </Button>
                <Button
                  type="button"
                  disabled={currentDimension ? selections[currentDimension].length === 0 : false}
                  onClick={() => {
                    if (lastStep) setMode("results");
                    else setStep((current) => current + 1);
                  }}
                  className="h-11 rounded-lg bg-[#d8ecf9] px-5 text-base shadow-none hover:bg-[#cce5f5] disabled:bg-[#eceff2]"
                >
                  {lastStep ? "Find opportunities" : "Continue"}
                  <ArrowRight />
                </Button>
              </div>
            </div>
          ) : (
            <Results
              opportunities={opportunities}
              taxonomy={taxonomy}
              callTypes={callTypes}
              selections={selections}
              budget={budget}
              timing={timing}
              profileSummary={profileSummary}
              dimensionLabels={dimensionMeta}
              onEdit={() => setMode("profile")}
              onReset={resetProfile}
              onSelect={selectOpportunity}
            />
          )}
        </section>
      </div>

      <OpportunitySheet
        opportunity={opportunities.find((o) => o.record.id === selectedId) ?? null}
        callTypes={callTypes}
        onClose={() => selectOpportunity(null)}
      />
    </main>
  );
}

function PreferenceRangeCard({
  heading,
  hint,
  chips,
  selectedChip,
  onChipSelect,
  range,
  maxIndex,
  onRangeChange,
  scaleYears,
  showQuarters = false,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  ariaLabel,
}: {
  heading?: string;
  hint?: string;
  chips?: string[];
  selectedChip?: string | null;
  onChipSelect?: (label: string) => void;
  range: [number, number];
  maxIndex: number;
  onRangeChange: (range: [number, number]) => void;
  scaleYears?: number[];
  showQuarters?: boolean;
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
      {chips && onChipSelect && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#46535e]">Quick ranges</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {chips.map((chip) => {
              const isSelected = chip === selectedChip;
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChipSelect(chip)}
                  className={`min-h-9 rounded-lg border px-2 py-1.5 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fc6e7] ${
                    isSelected
                      ? "border-[#70afd3] bg-[#dceefa] text-[#164d73]"
                      : "border-[#e0e5e9] bg-[#f5f7f9] text-[#27313a] hover:bg-[#eaf1f6]"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
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
        {scaleYears && (
          <div
            className="mt-1 grid text-center text-xs text-[#61717d]"
            style={{ gridTemplateColumns: `repeat(${scaleYears.length}, minmax(0, 1fr))` }}
          >
            {scaleYears.map((year) => (
              <div key={year} className="min-w-0">
                {showQuarters && (
                  <div className="grid grid-cols-4">
                    {quarters.map((quarter) => (
                      <span key={quarter}>{quarter}</span>
                    ))}
                  </div>
                )}
                <span className="font-semibold">{year}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-[#d3d9df] bg-white px-3 py-2.5">
          <p className="text-sm font-semibold text-[#68737d]">{minLabel}</p>
          <p className="mt-1 break-words text-base font-semibold tracking-[-0.02em] sm:text-lg">
            {minValue}
          </p>
        </div>
        <div className="rounded-lg border border-[#d3d9df] bg-white px-3 py-2.5 text-right">
          <p className="text-sm font-semibold text-[#68737d]">{maxLabel}</p>
          <p className="mt-1 break-words text-base font-semibold tracking-[-0.02em] sm:text-lg">
            {maxValue}
          </p>
        </div>
      </div>
    </section>
  );
}
