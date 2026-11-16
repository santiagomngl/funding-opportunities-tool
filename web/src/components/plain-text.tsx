import type { ReactNode } from "react";
import { sourceLines, textBlocks } from "@/lib/report.ts";

/** Shows a report answer exactly as written: paragraphs and "- " bullets, no markup. */
export function PlainText({
  text,
  compact = false,
  trailing,
}: {
  text: string;
  compact?: boolean;
  /** Placed after the last word, e.g. a citation number. */
  trailing?: ReactNode;
}) {
  const blocks = textBlocks(text);
  return blocks.map((block, index) => {
    const last = index === blocks.length - 1;
    if (block.type === "list") {
      return (
        <ul
          key={index}
          className={`${compact ? "pl-4" : "pl-5"} mb-4 list-disc space-y-2 last:mb-0`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {item}
              {last && itemIndex === block.items.length - 1 && trailing}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={index} className="mb-3 last:mb-0">
        {block.text}
        {last && trailing}
      </p>
    );
  });
}

export function Sources({ sources, className = "" }: { sources: string; className?: string }) {
  const lines = sourceLines(sources);
  return (
    <div
      className={`${className} text-[10px] font-normal leading-[1.4] text-[#56616b]`}
    >
      <p>{lines.length > 1 ? "Sources:" : "Source:"}</p>
      {lines.map((line, index) => (
        <p key={index} className="mt-1 break-words">
          {line}
        </p>
      ))}
    </div>
  );
}
