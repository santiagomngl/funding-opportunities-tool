import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowDownWideNarrow, ArrowRight, FileText, ListChecks, Maximize2, Minimize2 } from "lucide-react";
import siteData from "virtual:funding-data";

import { OpportunityPage } from "@/components/detail-view.tsx";
import { Questionnaire, type StepKey } from "@/components/questionnaire.tsx";
import { Results } from "@/components/results.tsx";
import {
  detailContainerClassName,
  focusRingClassName,
  iconControlClassName,
  primaryControlClassName,
} from "@/components/styles.ts";
import { defaultAnswers, toBudget, toTiming, type Answers } from "@/lib/answers.ts";
import { localToday } from "@/lib/format.ts";
import { buildListing, defaultListingOptions, type ListingOptions } from "@/lib/listing.ts";
import { buildHash, parseHash, type Route, type RouteContext } from "@/lib/route.ts";
import { dimensions, type Dimension } from "@/lib/types.ts";

const { taxonomy, callTypes, opportunities } = siteData;

// A dimension without options (a broken taxonomy file) is left out, so the
// questionnaire can always be completed.
const steps: StepKey[] = [
  ...dimensions.filter((dimension) => taxonomy[dimension].length > 0),
  "budget",
  "timing",
];

const firstYear = new Date().getFullYear();
const routeContext: RouteContext = {
  steps,
  codes: Object.fromEntries(
    dimensions.map((dimension) => [dimension, taxonomy[dimension].map((entry) => entry.code)]),
  ) as Record<Dimension, string[]>,
  opportunityIds: opportunities.map((opportunity) => opportunity.record.id),
  firstYear,
};

const landingSteps = [
  { icon: ListChecks, title: `Answer ${steps.length} questions`, text: "Topic, role, activity, outcome, budget and timing." },
  { icon: ArrowDownWideNarrow, title: "See the calls ranked", text: "Every open call, ordered by how well it fits your project." },
  { icon: FileText, title: "Read the report", text: "Requirements, funding, timing and how to apply, with sources." },
];

function readAddress() {
  return parseHash(window.location.hash, routeContext);
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readAddress().route);
  const [answers, setAnswers] = useState<Answers>(() => readAddress().answers ?? defaultAnswers());
  const [options, setOptions] = useState<ListingOptions>(defaultListingOptions);
  const [showDefinitions, setShowDefinitions] = useState(true);
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const today = localToday();

  useEffect(() => {
    setCanUseFullscreen(document.fullscreenEnabled);
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    // The browser's Back and Forward buttons, and an address typed by hand.
    const syncAddress = () => {
      const address = readAddress();
      setRoute(address.route);
      if (address.answers) setAnswers(address.answers);
    };
    window.history.scrollRestoration = "manual";
    document.addEventListener("fullscreenchange", syncFullscreenState);
    window.addEventListener("popstate", syncAddress);
    syncFullscreenState();
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      window.removeEventListener("popstate", syncAddress);
    };
  }, []);

  const addressOf = (target: Route, withAnswers: Answers = answers) =>
    buildHash(target, withAnswers, routeContext) || `${window.location.pathname}${window.location.search}`;

  /** Opens a screen as a new entry in the browser's history. */
  function go(target: Route, withAnswers: Answers = answers) {
    window.history.pushState(null, "", addressOf(target, withAnswers));
    setRoute(target);
    if (withAnswers !== answers) setAnswers(withAnswers);
  }

  // The address follows the answers while they change, without adding history
  // entries. Waiting a moment keeps a dragged slider from flooding the browser.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.history.replaceState(null, "", addressOf(route));
      } catch {
        // Some browsers limit how often the address may change; the next change catches up.
      }
    }, 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, route]);

  // A new screen starts at the top; coming back to the list returns to where it was left.
  const previousRoute = useRef(route);
  const listScroll = useRef(0);
  useLayoutEffect(() => {
    const was = previousRoute.current;
    previousRoute.current = route;
    if (was === route) return;
    const toList = route.screen === "results" || route.screen === "browse";
    window.scrollTo({ top: toList && was.screen === "opportunity" ? listScroll.current : 0, behavior: "instant" });
  }, [route]);

  const ranked = route.screen === "results" || (route.screen === "opportunity" && route.ranked);
  const listing = useMemo(
    () =>
      buildListing(
        opportunities,
        ranked
          ? {
              selections: answers.selections,
              budget: toBudget(answers.budget),
              timing: toTiming(answers.start, answers.end, firstYear),
            }
          : null,
        options,
        today,
      ),
    [ranked, answers, options, today],
  );

  const opportunity =
    route.screen === "opportunity"
      ? (opportunities.find((entry) => entry.record.id === route.id) ?? null)
      : null;

  useEffect(() => {
    const name = "Innovation Funding Desk";
    document.title = opportunity
      ? `${opportunity.record.display_title} · ${name}`
      : route.screen === "results"
        ? `Your matches · ${name}`
        : route.screen === "browse"
          ? `All opportunities · ${name}`
          : name;
  }, [route, opportunity]);

  function openOpportunity(id: string) {
    if (route.screen !== "opportunity") listScroll.current = window.scrollY;
    go({ screen: "opportunity", id, ranked });
  }

  function startOver() {
    setOptions(defaultListingOptions);
    go({ screen: "intro" }, defaultAnswers());
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

  const plainClick = (event: MouseEvent<HTMLAnchorElement>) =>
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);

  let detail = null;
  if (opportunity && route.screen === "opportunity") {
    const index = listing.cards.findIndex((card) => card.opportunity.record.id === opportunity.record.id);
    const back: Route = { screen: ranked ? "results" : "browse" };
    detail = (
      <OpportunityPage
        opportunity={opportunity}
        callTypes={callTypes}
        match={index >= 0 ? listing.cards[index].match : null}
        today={today}
        backLabel={ranked ? "Back to results" : "All opportunities"}
        backHref={addressOf(back)}
        onBack={() => go(back)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#27313a]">
      <header
        data-sticky-bar
        className="sticky top-0 z-30 border-b border-[#dfe3e8] bg-[#f6f7f9]/95 backdrop-blur"
      >
        {/* On the detail page the header lines up with that page's wider content. */}
        <div
          className={`flex h-[var(--header-h)] items-center gap-3 ${
            detail ? detailContainerClassName : "mx-auto max-w-[var(--tool-header-width)] px-4 sm:px-7"
          }`}
        >
          <a
            href={addressOf({ screen: "intro" })}
            onClick={(event) => {
              if (!plainClick(event)) return;
              event.preventDefault();
              go({ screen: "intro" });
            }}
            aria-label="Innovation Funding Desk, back to the start"
            className={`-ml-1 flex min-w-0 items-center gap-2.5 rounded-lg p-1 ${focusRingClassName}`}
          >
            <img
              src="/innovation-funding-desk-logo.png"
              alt=""
              width={778}
              height={771}
              className="h-[2.25rem] w-auto shrink-0 object-contain"
            />
            <span className="desk-brand-title truncate text-[1.125rem] font-extrabold leading-tight tracking-[-0.035em] sm:text-[1.25rem]">
              Innovation Funding Desk
            </span>
          </a>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <img
              src="/tennet-logo.webp"
              alt="TenneT"
              width={1280}
              height={242}
              className="h-[1.125rem] w-auto object-contain sm:h-[1.5rem]"
            />
            {canUseFullscreen && (
              <button
                type="button"
                aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
                title={isFullscreen ? "Exit full screen" : "Full screen"}
                aria-pressed={isFullscreen}
                onClick={toggleFullscreen}
                className={`${iconControlClassName} text-[#58636d] hover:bg-[#e7f2fb] hover:text-[#27313a]`}
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {detail ?? (
        <div className="mx-auto max-w-[var(--tool-content-width)] px-4 pt-6 sm:px-7 sm:pt-8">
          {route.screen === "intro" ? (
            <div className="screen-enter flex min-h-[calc(100dvh-var(--header-h)-4rem)] items-center justify-center pb-10 text-center">
              <div className="max-w-full">
                <h1 className="landing-title mx-auto text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  What does your innovation look like?
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.4]">
                  Describe your project and see, in seconds, the funding opportunities that fit it best.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                  <button
                    type="button"
                    onClick={() => go({ screen: "questions", step: 0 })}
                    className={`${primaryControlClassName} min-h-[3.25rem] rounded-xl px-7 text-[1.0625rem]`}
                  >
                    Start <ArrowRight className="size-5" aria-hidden="true" />
                  </button>
                  {opportunities.length > 0 && (
                    <a
                      href={addressOf({ screen: "browse" })}
                      onClick={(event) => {
                        if (!plainClick(event)) return;
                        event.preventDefault();
                        go({ screen: "browse" });
                      }}
                      className={`inline-flex min-h-[2.25rem] items-center rounded-lg px-2 text-base font-medium text-[#286a99] underline decoration-[#9bccea] underline-offset-4 hover:bg-[#e7f2fb] ${focusRingClassName}`}
                    >
                      Browse all {opportunities.length} opportunities
                    </a>
                  )}
                </div>
                {opportunities.length === 0 && (
                  <p className="mx-auto mt-6 max-w-md text-sm leading-[1.5] text-[#58636d]">
                    No funding opportunities have been published here yet. You can still try the
                    questionnaire.
                  </p>
                )}
                <ol className="mx-auto mt-12 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
                  {landingSteps.map((item, index) => (
                    <li key={item.title} className="flex gap-3 rounded-xl border border-[#dfe3e8] bg-white p-4">
                      <span className="grid size-[2.25rem] shrink-0 place-items-center rounded-lg bg-[#e7f2fb] text-[#164d73]">
                        <item.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold leading-[1.35]">
                          <span className="text-[#58636d]">{index + 1}.</span> {item.title}
                        </span>
                        <span className="mt-1 block text-sm leading-[1.45] text-[#58636d]">{item.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : route.screen === "questions" ? (
            <Questionnaire
              taxonomy={taxonomy}
              steps={steps}
              step={route.step}
              answers={answers}
              firstYear={firstYear}
              showDefinitions={showDefinitions}
              onShowDefinitions={setShowDefinitions}
              onAnswers={setAnswers}
              onStep={(step) => go({ screen: "questions", step })}
              onFinish={() => go({ screen: "results" })}
              onReset={startOver}
            />
          ) : (
            <div className="pb-12">
              <Results
                listing={listing}
                ranked={ranked}
                options={options}
                onOptions={setOptions}
                published={opportunities.length}
                taxonomy={taxonomy}
                callTypes={callTypes}
                answers={answers}
                steps={steps}
                firstYear={firstYear}
                today={today}
                hrefFor={(id) => addressOf({ screen: "opportunity", id, ranked })}
                onOpen={openOpportunity}
                onEditStep={(step) => go({ screen: "questions", step })}
                onStart={() => go({ screen: "questions", step: 0 })}
                onReset={startOver}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
