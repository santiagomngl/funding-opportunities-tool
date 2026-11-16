import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Share2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArticleView } from "@/components/article-view.tsx";
import { CallTypeDefinitions, CallTypeTags } from "@/components/call-type-tags.tsx";
import { detailContainerClassName } from "@/components/styles.ts";
import { PlainText, Sources } from "@/components/plain-text.tsx";
import { formatProjectSize, formatProjectWindow, formatSubmissionWindow } from "@/lib/format.ts";
import { splitReport, type VisibleCard, type VisibleSection } from "@/lib/report.ts";
import type { FoRecord, Opportunity, SiteData } from "@/lib/types.ts";

const palettes = [
  {
    frame: "border-[#c9e6d8] bg-[#f2fbf6] open:border-[#98d3b5]",
    hover: "hover:bg-[#edf8f2]",
    title: "text-[#116a4a]",
    icon: "bg-[#dff3e9] text-[#116a4a]",
    divider: "border-[#d7ece2]",
  },
  {
    frame: "border-[#c8dfea] bg-[#f3f8fb] open:border-[#9ec8dc]",
    hover: "hover:bg-[#edf5f9]",
    title: "text-[#164d73]",
    icon: "bg-[#dceef6] text-[#164d73]",
    divider: "border-[#d7e6ed]",
  },
  {
    frame: "border-[#c8e5e1] bg-[#f2faf9] open:border-[#9bd3cc]",
    hover: "hover:bg-[#edf7f6]",
    title: "text-[#17675f]",
    icon: "bg-[#dcf1ee] text-[#17675f]",
    divider: "border-[#d7ebe8]",
  },
  {
    frame: "border-[#d2dde6] bg-[#f5f8fb] open:border-[#aebfce]",
    hover: "hover:bg-[#eff4f7]",
    title: "text-[#173a52]",
    icon: "bg-[#e1eaf1] text-[#173a52]",
    divider: "border-[#dfe7ed]",
  },
] as const;

const paletteAt = (index: number) => palettes[index % palettes.length];

export function OpportunitySheet({
  opportunity,
  callTypes,
  onClose,
}: {
  opportunity: Opportunity | null;
  callTypes: SiteData["callTypes"];
  onClose: () => void;
}) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [view, setView] = useState<"cards" | "article">("cards");
  const report = opportunity?.report ?? null;
  const sections = useMemo(() => (report ? splitReport(report) : null), [report]);
  const hasContent = Boolean(sections && sections.side.length + sections.main.length > 0);

  function close() {
    setShareStatus("idle");
    setView("cards");
    onClose();
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

  return (
    <Sheet open={Boolean(opportunity)} onOpenChange={(open) => !open && close()}>
      <SheetContent
        aria-describedby={undefined}
        className="inset-y-0 left-0 right-0 flex h-dvh w-screen max-w-none flex-col gap-0 overflow-y-auto lg:overflow-hidden border-0 bg-white p-0 text-[#27313a] shadow-none sm:max-w-none"
      >
        {opportunity && (
          <>
            <SheetHeader className="border-b border-[#dfe3e8] bg-white py-4 pl-0 pr-0 sm:py-5">
              <div className={detailContainerClassName}>
                <div className="flex flex-col gap-3 pr-9 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                  <div className="min-w-0 flex-1">
                    {opportunity.record.organization_or_parent_framework && (
                      <p className="text-sm font-medium leading-[1.45] text-[#58636d]">
                        {opportunity.record.organization_or_parent_framework}
                      </p>
                    )}
                    <SheetTitle className="mt-1.5 text-2xl font-semibold leading-[1.35] tracking-[-0.03em] text-[#27313a] sm:text-3xl sm:leading-[1.35]">
                      {opportunity.record.display_title}
                    </SheetTitle>
                  </div>
                  <Actions url={opportunity.record.url} onShare={share} shareStatus={shareStatus} />
                </div>
                {/* Always on their own lines, below the title: tags, definitions, summary. */}
                <CallTypeTags record={opportunity.record} callTypes={callTypes} className="mt-2.5" />
                <CallTypeDefinitions record={opportunity.record} callTypes={callTypes} className="mt-2" />
                {opportunity.record.executive_summary && (
                  <p data-executive-summary className="mt-2.5 text-sm leading-[1.5] text-[#27313a]">
                    {opportunity.record.executive_summary}
                  </p>
                )}
                {hasContent && (
                  <button
                    type="button"
                    onClick={() => setView((current) => (current === "cards" ? "article" : "cards"))}
                    className="mt-2.5 rounded-lg border border-[#afd8d1] bg-[#d9eee9] px-3 py-1.5 text-sm font-semibold text-[#175e55] transition-colors hover:bg-[#cce7e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#83c6ba]"
                  >
                    {view === "cards" ? "Change to Article View" : "Change to Card View"}
                  </button>
                )}
              </div>
            </SheetHeader>

            {sections && hasContent ? (
              view === "cards" ? (
                <CardView side={sections.side} main={sections.main} />
              ) : (
                <ArticleView sections={[...sections.main, ...sections.side]} />
              )
            ) : (
              <NoReport record={opportunity.record} />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Actions({
  url,
  onShare,
  shareStatus,
}: {
  url: string | null;
  onShare: () => void;
  shareStatus: "idle" | "copied";
}) {
  const applyClassName =
    "flex min-h-9 items-center justify-between gap-2 rounded-lg bg-[#18734d] px-3 py-2 text-sm font-semibold text-white";
  return (
    <aside className="shrink-0 self-start lg:self-end" aria-label="Proposal actions">
      <div className="flex items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`${applyClassName} transition-colors hover:bg-[#125f3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fcbb3]`}
          >
            <span>Apply</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="No application link is available for this funding opportunity."
            className={`${applyClassName} cursor-not-allowed opacity-55`}
          >
            <span>Apply</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </button>
        )}
        <button
          type="button"
          onClick={onShare}
          className="flex min-h-9 items-center justify-between gap-2 rounded-lg bg-[#164d73] px-3 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-[#103e5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
        >
          <span>{shareStatus === "copied" ? "Link copied" : "Share"}</span>
          {shareStatus === "copied" ? (
            <Check className="size-3.5 shrink-0" />
          ) : (
            <Share2 className="size-3.5 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}

/** Shown when the report has not been written (or holds no answers yet). */
function NoReport({ record }: { record: FoRecord }) {
  const facts: [string, string[]][] = [
    ["Project size", [formatProjectSize(record.minimum_project_size, record.maximum_project_size)]],
    ["Project window", [formatProjectWindow(record.earliest_project_start_date, record.project_end_date)]],
    [
      "Proposal submission window",
      formatSubmissionWindow(record.pre_submission_deadline, record.full_proposal_deadline),
    ],
  ];
  return (
    <div className="bg-white lg:flex-1 lg:overflow-y-auto">
      <div className={`${detailContainerClassName} py-7 sm:py-9`}>
        <dl className="grid gap-x-7 gap-y-4 sm:grid-cols-3">
          {facts.map(([label, lines]) => (
            <div key={label}>
              <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#164d73]">{label}</dt>
              <dd className="mt-1.5 text-sm leading-[1.45] text-[#58636d]">
                {lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 rounded-xl border border-dashed border-[#c6ccd2] bg-[#fbfcfd] px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">The detailed report has not been written yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
            This page will show the project requirements, funding, timing and submission details of
            this funding opportunity once its report is ready.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Funding, timing and submission on the left; the rest of the report on the right. */
function CardView({ side, main }: { side: VisibleSection[]; main: VisibleSection[] }) {
  return (
    <div className="bg-white lg:flex-1 lg:overflow-y-auto">
      <div
        className={`${detailContainerClassName} grid gap-8 py-7 sm:py-9 lg:grid-cols-[minmax(0,34fr)_minmax(0,66fr)] lg:items-start lg:gap-x-[2.7%]`}
      >
        {side.length > 0 && (
          <aside
            data-report-side="left"
            className="min-w-0 self-start [overflow-wrap:anywhere] lg:col-start-1 lg:row-start-1 xl:sticky xl:top-8 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto"
          >
            <div className="overflow-hidden rounded-xl border border-[#dfe3e8] bg-white">
              <div className="grid gap-3 bg-[#f8fbfd] p-3">
                {side.map((section, index) => {
                  const palette = paletteAt(index);
                  return (
                    <details
                      key={section.id}
                      className={`group/sidebar-section overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(26,48,65,0.035)] transition-colors ${palette.frame}`}
                    >
                      <summary
                        className={`flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 marker:content-none transition-colors ${palette.hover}`}
                      >
                        <SectionHeading section={section} palette={palette} compact />
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full ${palette.icon}`}>
                          <ChevronDown className="size-4 transition-transform duration-200 group-open/sidebar-section:rotate-180" />
                        </span>
                      </summary>
                      <div className={`grid items-start gap-3 border-t bg-white p-3 ${palette.divider}`}>
                        {section.cards.map((card, cardIndex) => (
                          <ReportCardView key={card.id} card={card} index={cardIndex} compact />
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <article data-report-side="right" className="min-w-0 pb-16 lg:col-start-2">
          {main.map((section) => (
            <details
              key={section.id}
              className="group mb-4 scroll-mt-6 overflow-hidden rounded-2xl border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(26,48,65,0.04)]"
            >
              <summary className="brief-summary flex cursor-pointer list-none items-center gap-4 px-5 py-5 marker:content-none transition-colors hover:bg-[#f8fbfd] sm:px-6">
                <SectionHeading section={section} />
                <ChevronDown className="size-5 shrink-0 text-[#58636d] transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="border-t border-[#e5e8eb] bg-[#fbfcfd] px-5 py-5 sm:px-6 sm:py-6">
                <div className="question-card-container">
                  <div className="question-card-grid">
                    {section.cards.map((card, cardIndex) => (
                      <ReportCardView key={card.id} card={card} index={cardIndex} />
                    ))}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </article>
      </div>
    </div>
  );
}

function SectionHeading({
  section,
  palette,
  compact = false,
}: {
  section: VisibleSection;
  palette?: (typeof palettes)[number];
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      {section.question && (
        <p className={`text-sm font-semibold leading-[1.45] ${palette?.title ?? "text-[#164d73]"}`}>
          {section.title}
        </p>
      )}
      <h3
        className={
          compact
            ? "min-w-0 text-sm font-semibold leading-[1.45] text-black"
            : "min-w-0 text-lg font-semibold leading-[1.55] tracking-[-0.02em] text-black sm:text-xl"
        }
      >
        {section.question ?? section.title}
      </h3>
    </div>
  );
}

function ReportCardView({
  card,
  index,
  compact = false,
}: {
  card: VisibleCard;
  index: number;
  compact?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const palette = paletteAt(index);

  async function copyCard() {
    const text = [card.title, card.question, card.answer, card.sources].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <details
      className={`group/section ${compact ? "" : "question-card-item "}self-start overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(26,48,65,0.04)] transition-colors ${palette.frame}`}
    >
      <summary
        className={`flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 marker:content-none transition-colors ${compact ? "" : "sm:px-5"} ${palette.hover}`}
      >
        <div className="min-w-0">
          <h4 className={`text-sm font-semibold leading-[1.45] ${palette.title}`}>{card.title}</h4>
          {card.question && (
            <p className="mt-2 text-base font-semibold leading-[1.5] text-black">{card.question}</p>
          )}
        </div>
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${palette.icon}`}>
          <ChevronDown className="size-4 transition-transform duration-200 group-open/section:rotate-180" />
        </span>
      </summary>
      <div
        className={`border-t px-4 pb-4 pt-3 text-black ${compact ? "text-sm leading-[1.5]" : "text-base leading-[1.55] sm:px-5 sm:pb-5 sm:pt-4"} ${palette.divider}`}
      >
        <PlainText text={card.answer} compact={compact} />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={copyCard}
            aria-label={`Copy complete ${card.title} card`}
            title={copyStatus === "copied" ? "Copied" : "Copy card to clipboard"}
            className="grid size-8 place-items-center rounded-md border border-[#d7e1e7] bg-white text-[#364651] transition-colors hover:border-[#a9c9db] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
          >
            {copyStatus === "copied" ? (
              <Check className="size-4 text-[#18734d]" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </button>
          <span role="status" className="sr-only">
            {copyStatus === "copied"
              ? "Card copied to clipboard"
              : copyStatus === "failed"
                ? "Could not copy the card"
                : ""}
          </span>
        </div>
        {card.sources && (
          <Sources sources={card.sources} className="mt-2 border-t border-black/10 pt-3" />
        )}
      </div>
    </details>
  );
}
