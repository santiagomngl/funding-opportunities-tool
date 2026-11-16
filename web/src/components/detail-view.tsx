import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ArrowLeft,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Share2,
} from "lucide-react";

import { ArticleView } from "@/components/article-view.tsx";
import { CallTypeInfo } from "@/components/call-type-tags.tsx";
import { DeadlineBadge, MatchRing } from "@/components/facts.tsx";
import { PlainText, Sources } from "@/components/plain-text.tsx";
import { scrollToAnchor, useActiveAnchor } from "@/components/scroll-spy.ts";
import {
  controlClassName,
  detailContainerClassName,
  focusRingClassName,
  ghostControlClassName,
  iconControlClassName,
  outlineControlClassName,
} from "@/components/styles.ts";
import {
  deadlineStatus,
  formatProjectSize,
  formatProjectWindow,
  formatSubmissionWindow,
  splitTitle,
} from "@/lib/format.ts";
import type { Match } from "@/lib/match.ts";
import { splitReport, type VisibleCard, type VisibleSection } from "@/lib/report.ts";
import type { Opportunity, SiteData } from "@/lib/types.ts";

// One colour per section, so a colour says where you are in the report.
const palettes = [
  { card: "border-[#c9e6d8] bg-[#f2fbf6]", title: "text-[#116a4a]", dot: "bg-[#98d3b5]", icon: "bg-[#dff3e9] text-[#116a4a]" },
  { card: "border-[#c8dfea] bg-[#f3f8fb]", title: "text-[#164d73]", dot: "bg-[#9ec8dc]", icon: "bg-[#dceef6] text-[#164d73]" },
  { card: "border-[#c8e5e1] bg-[#f2faf9]", title: "text-[#17675f]", dot: "bg-[#9bd3cc]", icon: "bg-[#dcf1ee] text-[#17675f]" },
  { card: "border-[#d2dde6] bg-[#f5f8fb]", title: "text-[#173a52]", dot: "bg-[#aebfce]", icon: "bg-[#e1eaf1] text-[#173a52]" },
] as const;
type Palette = (typeof palettes)[number];

type View = "cards" | "article";
type Neighbour = { id: string; href: string } | null;

export function OpportunityPage({
  opportunity,
  callTypes,
  match,
  today,
  position,
  previous,
  next,
  backLabel,
  backHref,
  onBack,
  onOpen,
}: {
  opportunity: Opportunity;
  callTypes: SiteData["callTypes"];
  /** The match with the questionnaire answers; null when opened from the full list. */
  match: Match | null;
  today: string;
  /** Where this opportunity sits in the list it was opened from. */
  position: { index: number; total: number } | null;
  previous: Neighbour;
  next: Neighbour;
  backLabel: string;
  backHref: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const record = opportunity.record;
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [view, setView] = useState<View>("cards");
  const sections = useMemo(
    () => (opportunity.report ? splitReport(opportunity.report) : { side: [], main: [] }),
    [opportunity.report],
  );
  const all = useMemo(() => [...sections.side, ...sections.main], [sections]);
  const hasContent = all.length > 0;
  const paletteOf = (id: string) => palettes[Math.max(all.findIndex((section) => section.id === id), 0) % palettes.length];

  // Sections start open. A closed one is remembered while this opportunity is on screen.
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useActiveAnchor("[data-section-anchor]", `${record.id}-${view}`);
  const title = useRef<HTMLHeadingElement>(null);
  const sectionNav = useRef<HTMLElement>(null);

  // Keep the current section's name in view in the row of section links.
  useEffect(() => {
    const nav = sectionNav.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link) return;
    const left = link.offsetLeft - 16;
    const right = link.offsetLeft + link.offsetWidth + 16;
    if (left < nav.scrollLeft) nav.scrollTo({ left, behavior: "instant" });
    else if (right > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: right - nav.clientWidth, behavior: "instant" });
  }, [activeId]);

  useEffect(() => {
    setClosed(new Set());
    setShareStatus("idle");
    title.current?.focus({ preventScroll: true });
  }, [record.id]);

  const { callId, title: shownTitle } = splitTitle(record.display_title, record.programme);
  const status = deadlineStatus(record.pre_submission_deadline, record.full_proposal_deadline, today);
  const hasWindow = record.earliest_project_start_date !== null || record.project_end_date !== null;
  const hasSize = record.minimum_project_size !== null || record.maximum_project_size !== null;
  const origin = [record.organization_or_parent_framework, record.programme].filter(Boolean).join(" · ");

  function toggleSection(id: string) {
    setClosed((current) => {
      const nextSet = new Set(current);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  function jumpTo(id: string) {
    setClosed((current) => {
      if (!current.has(id)) return current;
      const nextSet = new Set(current);
      nextSet.delete(id);
      return nextSet;
    });
    scrollToAnchor(id);
    setActiveId(id);
  }

  // Share copies a link that opens this opportunity directly.
  async function share() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2200);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  // Real links, so Back and Previous/Next also work in a new tab.
  const inPage = (action: () => void) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    action();
  };

  const allClosed = hasContent && all.every((section) => closed.has(section.id));

  return (
    <div className="min-h-[calc(100dvh-var(--header-h))] bg-white text-[#27313a]">
      <div
        data-sticky-bar
        className="sticky top-[var(--header-h)] z-20 border-b border-[#dfe3e8] bg-white/95 backdrop-blur"
      >
        <div className={`${detailContainerClassName} flex items-center justify-between gap-3 py-1.5`}>
          <a href={backHref} onClick={inPage(onBack)} className={`${ghostControlClassName} -ml-2 font-semibold text-[#164d73]`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </a>
          {position && (
            <nav aria-label="Other opportunities in the list" className="flex items-center gap-1">
              <span className="mr-1 text-sm font-medium tabular-nums text-[#58636d]">
                {position.index + 1} of {position.total}
              </span>
              <NeighbourLink neighbour={previous} label="Previous opportunity" onOpen={onOpen} inPage={inPage}>
                <ChevronLeft className="size-5" aria-hidden="true" />
              </NeighbourLink>
              <NeighbourLink neighbour={next} label="Next opportunity" onOpen={onOpen} inPage={inPage}>
                <ChevronRight className="size-5" aria-hidden="true" />
              </NeighbourLink>
            </nav>
          )}
        </div>
        {hasContent && view === "cards" && (
          <div className={`${detailContainerClassName} flex items-center gap-2 pb-1.5`}>
            <nav ref={sectionNav} aria-label="Report sections" className="no-scrollbar relative min-w-0 flex-1 overflow-x-auto">
              <ul className="flex items-center gap-1 py-0.5">
                {all.map((section) => {
                  const current = activeId === section.id;
                  return (
                    <li key={section.id} className="shrink-0">
                      <a
                        href={`#${section.id}`}
                        aria-current={current ? "location" : undefined}
                        onClick={inPage(() => jumpTo(section.id))}
                        className={`inline-flex min-h-[2rem] items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap transition-colors ${focusRingClassName} ${
                          current
                            ? "bg-[#e7f2fb] font-semibold text-[#164d73]"
                            : "font-medium text-[#27313a] hover:bg-[#f0f2f4]"
                        }`}
                      >
                        <span className={`size-2 rounded-full ${paletteOf(section.id).dot}`} aria-hidden="true" />
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <button
              type="button"
              onClick={() => setClosed(allClosed ? new Set() : new Set(all.map((section) => section.id)))}
              className={`${ghostControlClassName} shrink-0 px-2`}
            >
              {allClosed ? (
                <ChevronsUpDown className="size-4" aria-hidden="true" />
              ) : (
                <ChevronsDownUp className="size-4" aria-hidden="true" />
              )}
              <span className="max-sm:sr-only">{allClosed ? "Expand all" : "Collapse all"}</span>
            </button>
          </div>
        )}
      </div>

      <header key={record.id} className="screen-enter border-b border-[#dfe3e8]">
        <div className={`${detailContainerClassName} py-4 sm:py-5`}>
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm leading-[1.45] text-[#58636d]">
            {callId && <span className="font-mono text-xs font-semibold text-[#164d73]">{callId}</span>}
            {origin && <span className="font-medium">{origin}</span>}
          </p>
          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <h1
              ref={title}
              tabIndex={-1}
              className="min-w-0 text-2xl font-semibold leading-[1.3] tracking-[-0.03em] outline-none sm:text-3xl sm:leading-[1.3]"
            >
              {shownTitle}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              {record.url ? (
                <a
                  href={record.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${controlClassName} bg-[#18734d] px-4 font-semibold text-white hover:bg-[#125f3f] focus-visible:ring-[#8fcbb3]`}
                >
                  Apply <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="No application link is available for this funding opportunity."
                  className={`${controlClassName} bg-[#18734d] px-4 font-semibold text-white`}
                >
                  Apply <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={share} className={outlineControlClassName}>
                {shareStatus === "copied" ? (
                  <Check className="size-4 shrink-0 text-[#18734d]" aria-hidden="true" />
                ) : (
                  <Share2 className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span aria-live="polite">{shareStatus === "copied" ? "Link copied" : "Share"}</span>
              </button>
            </div>
          </div>

          <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm leading-[1.45]">
            {match && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Match</dt>
                <dd className="flex items-center gap-2 font-semibold text-[#164d73]">
                  <MatchRing score={match.score} size={44} /> match
                </dd>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Clock className="size-4 shrink-0 text-[#58636d]" aria-hidden="true" />
              <dt className="sr-only">Proposal submission</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <DeadlineBadge status={status} />
                <span>
                  {formatSubmissionWindow(record.pre_submission_deadline, record.full_proposal_deadline).join(" · ")}
                </span>
              </dd>
            </div>
            {hasWindow && (
              <div className="flex items-center gap-2">
                <CalendarRange className="size-4 shrink-0 text-[#58636d]" aria-hidden="true" />
                <dt className="text-[#58636d] max-sm:sr-only">Project window</dt>
                <dd>{formatProjectWindow(record.earliest_project_start_date, record.project_end_date)}</dd>
              </div>
            )}
            {hasSize && (
              <div className="flex items-center gap-2">
                <Coins className="size-4 shrink-0 text-[#58636d]" aria-hidden="true" />
                <dt className="text-[#58636d] max-sm:sr-only">Project size</dt>
                <dd>{formatProjectSize(record.minimum_project_size, record.maximum_project_size)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <CallTypeInfo record={record} callTypes={callTypes} className="min-w-0 flex-1 basis-64" />
            {hasContent && (
              <div
                role="group"
                aria-label="How to show the report"
                className="inline-flex shrink-0 rounded-lg border border-[#d6dbe1] bg-[#f0f2f4] p-0.5"
              >
                {(["cards", "article"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={view === option}
                    onClick={() => setView(option)}
                    className={`min-h-[2rem] rounded-md px-3 text-sm font-semibold transition-colors ${focusRingClassName} ${
                      view === option ? "bg-white text-[#164d73] shadow-sm" : "text-[#58636d] hover:text-[#27313a]"
                    }`}
                  >
                    {option === "cards" ? "Cards" : "Article"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {hasContent ? (
        view === "cards" ? (
          <CardView
            key={record.id}
            side={sections.side}
            main={sections.main}
            closed={closed}
            onToggle={toggleSection}
            paletteOf={paletteOf}
          />
        ) : (
          <ArticleView key={record.id} sections={[...sections.main, ...sections.side]} />
        )
      ) : (
        <div className={`${detailContainerClassName} py-7 sm:py-9`}>
          <div className="rounded-xl border border-dashed border-[#c6ccd2] bg-[#fbfcfd] px-6 py-10 text-center">
            <h2 className="text-lg font-semibold">The detailed report has not been written yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
              This page will show the project requirements, funding, timing and submission details of
              this funding opportunity once its report is ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NeighbourLink({
  neighbour,
  label,
  onOpen,
  inPage,
  children,
}: {
  neighbour: Neighbour;
  label: string;
  onOpen: (id: string) => void;
  inPage: (action: () => void) => (event: MouseEvent<HTMLAnchorElement>) => void;
  children: React.ReactNode;
}) {
  const className = `${iconControlClassName} border border-[#d6dbe1] bg-white text-[#27313a]`;
  if (!neighbour) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${className} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <a
      href={neighbour.href}
      aria-label={label}
      title={label}
      onClick={inPage(() => onOpen(neighbour.id))}
      className={`${className} hover:border-[#aebbc6] hover:bg-[#f4f8fb]`}
    >
      {children}
    </a>
  );
}

/** Funding, timing and submission on the left; the rest of the report on the right. */
function CardView({
  side,
  main,
  closed,
  onToggle,
  paletteOf,
}: {
  side: VisibleSection[];
  main: VisibleSection[];
  closed: Set<string>;
  onToggle: (id: string) => void;
  paletteOf: (id: string) => Palette;
}) {
  const column = (sections: VisibleSection[], compact: boolean) =>
    sections.map((section) => (
      <ReportSectionView
        key={section.id}
        section={section}
        palette={paletteOf(section.id)}
        open={!closed.has(section.id)}
        onToggle={() => onToggle(section.id)}
        compact={compact}
      />
    ));
  return (
    <div
      className={`${detailContainerClassName} screen-enter grid gap-x-8 gap-y-2 py-5 sm:py-7 lg:grid-cols-[minmax(0,34fr)_minmax(0,66fr)] lg:items-start lg:gap-x-[2.7%]`}
    >
      {side.length > 0 && (
        <aside data-report-side="left" className="min-w-0 [overflow-wrap:anywhere] lg:col-start-1 lg:row-start-1">
          {column(side, true)}
        </aside>
      )}
      <article data-report-side="right" className="min-w-0 pb-16 lg:col-start-2">
        {column(main, false)}
      </article>
    </div>
  );
}

function ReportSectionView({
  section,
  palette,
  open,
  onToggle,
  compact,
}: {
  section: VisibleSection;
  palette: Palette;
  open: boolean;
  onToggle: () => void;
  compact: boolean;
}) {
  const panelId = `${section.id}-cards`;
  return (
    <section id={section.id} tabIndex={-1} data-section-anchor className="pb-5 outline-none">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={`group -ml-2 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-lg py-2 pr-0 pl-2 text-left transition-colors hover:bg-[#f4f8fb] ${focusRingClassName}`}
        >
          <span className="min-w-0 flex-1">
            <span className={`flex items-center gap-2 text-sm font-semibold leading-[1.45] ${palette.title}`}>
              <span className={`size-2 shrink-0 rounded-full ${palette.dot}`} aria-hidden="true" />
              {section.title}
            </span>
            {section.question && (
              <span
                className={`mt-0.5 block font-semibold leading-[1.4] tracking-[-0.02em] text-black ${
                  compact ? "text-base" : "text-lg sm:text-xl"
                }`}
              >
                {section.question}
              </span>
            )}
          </span>
          <span className={`grid size-[1.75rem] shrink-0 place-items-center rounded-full ${palette.icon}`}>
            <ChevronDown className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>
      </h2>
      <div id={panelId} className="collapsible" data-open={open} inert={!open}>
        <div>
          <div className={compact ? "grid gap-3 pt-2" : "question-card-container pt-2"}>
            <div className={compact ? "contents" : "question-card-grid"}>
              {section.cards.map((card) => (
                <ReportCardView key={card.id} card={card} palette={palette} compact={compact} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One surface: what the card is about, the question, the answer, and its sources. */
function ReportCardView({ card, palette, compact }: { card: VisibleCard; palette: Palette; compact: boolean }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyCard() {
    const text = [card.title, card.question, card.answer, card.sources].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <div className={`relative flex min-w-0 flex-col rounded-xl border p-4 ${compact ? "" : "sm:p-5"} ${palette.card}`}>
      <button
        type="button"
        onClick={copyCard}
        aria-label={`Copy the ${card.title} card`}
        title={copyStatus === "copied" ? "Copied" : "Copy card to clipboard"}
        className={`absolute top-2 right-2 grid size-[2rem] place-items-center rounded-md text-[#56616b] transition-colors hover:bg-white hover:text-[#27313a] ${focusRingClassName}`}
      >
        {copyStatus === "copied" ? (
          <Check className="size-4 text-[#18734d]" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span role="status" className="sr-only">
        {copyStatus === "copied" ? "Card copied to clipboard" : copyStatus === "failed" ? "Could not copy the card" : ""}
      </span>
      <h3 className={`pr-8 text-sm font-semibold leading-[1.45] ${palette.title}`}>{card.title}</h3>
      {card.question && (
        <p className={`mt-1 pr-8 font-semibold leading-[1.45] text-black ${compact ? "text-sm" : "text-base"}`}>
          {card.question}
        </p>
      )}
      <div className={`mt-2 text-black ${compact ? "text-sm leading-[1.5]" : "text-base leading-[1.55]"}`}>
        <PlainText text={card.answer} compact={compact} />
      </div>
      {card.sources && <Sources sources={card.sources} className="mt-auto pt-3" />}
    </div>
  );
}
