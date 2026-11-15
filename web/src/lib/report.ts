// Turns an FO report into what the detail view shows. Generic: it follows the
// JSON (block -> sections -> cards), so new wording or cards need no code change.

import type { FoReport, ReportSection } from "./types.ts";

/** The block shown on the left of the detail view; every other block goes on the right. */
export const SIDE_BLOCK = "funding_timing_submission";

export type VisibleCard = {
  id: string;
  title: string;
  question: string | null;
  answer: string;
  sources: string | null;
};
export type VisibleSection = {
  id: string;
  title: string;
  question: string | null;
  cards: VisibleCard[];
};

const filled = (text: string | null | undefined): text is string =>
  typeof text === "string" && text.trim() !== "";

/** Drops cards without an answer, and sections left without cards. */
export function visibleSections(sections: ReportSection[], idPrefix: string): VisibleSection[] {
  return sections
    .map((section, s) => ({
      id: `${idPrefix}-${s + 1}`,
      title: section.title,
      question: filled(section.question) ? section.question : null,
      cards: section.cards
        .map((card, c) => ({ card, id: `${idPrefix}-${s + 1}-${c + 1}` }))
        .filter(({ card }) => filled(card.answer))
        .map(({ card, id }) => ({
          id,
          title: card.title,
          question: filled(card.question) ? card.question : null,
          answer: card.answer as string,
          sources: filled(card.sources) ? card.sources : null,
        })),
    }))
    .filter((section) => section.cards.length > 0);
}

export function splitReport(report: FoReport): { side: VisibleSection[]; main: VisibleSection[] } {
  const side: VisibleSection[] = [];
  const main: VisibleSection[] = [];
  Object.entries(report).forEach(([block, sections], b) => {
    const visible = visibleSections(sections, `block-${b + 1}`);
    (block === SIDE_BLOCK ? side : main).push(...visible);
  });
  return { side, main };
}

export type TextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

/**
 * Report answers are plain text: each line is a paragraph, and consecutive
 * lines starting with "- " form a bullet list. Nothing else is interpreted.
 */
export function textBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(line.slice(2).trim());
      else blocks.push({ type: "list", items: [line.slice(2).trim()] });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }
  return blocks;
}

/** Sources are one per line. */
export function sourceLines(sources: string) {
  return sources.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
