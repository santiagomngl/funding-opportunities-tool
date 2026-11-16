import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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

/** A quiet "Sources (3)" line that opens the sources in place. */
export function Sources({ sources, className = "" }: { sources: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const lines = sourceLines(sources);
  return (
    <div className={`${className} text-xs leading-[1.45] text-[#56616b]`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="-mx-1.5 inline-flex min-h-[1.75rem] items-center gap-1 rounded-md px-1.5 font-medium transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
      >
        {lines.length > 1 ? `Sources (${lines.length})` : "Source"}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id={panelId} className="collapsible" data-open={open} inert={!open}>
        <div>
          {lines.map((line, index) => (
            <p key={index} className="mt-1 break-words">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
