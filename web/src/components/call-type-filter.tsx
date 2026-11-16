import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  toggleCategory,
  toggleType,
  typeState,
  type CallTypeSelection,
  type OptionCounts,
} from "@/lib/call-type-filter.ts";
import type { CallTypeGroup } from "@/lib/types.ts";

const checkboxClassName =
  "mt-0.5 size-4 shrink-0 cursor-pointer accent-[#164d73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]";

function Count({ value }: { value: number }) {
  return (
    <span
      aria-label={value === 1 ? "1 opportunity" : `${value} opportunities`}
      className="ml-auto shrink-0 rounded-full bg-[#eef1f4] px-2 py-0.5 text-xs font-semibold tabular-nums"
    >
      {value}
    </span>
  );
}

/** A heading checkbox that can also be partly ticked. */
function TypeCheckbox({ state, onChange }: { state: "all" | "some" | "none"; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      aria-checked={state === "some" ? "mixed" : state === "all"}
      onChange={onChange}
      className={checkboxClassName}
    />
  );
}

/**
 * One group per call type, one checkbox per category. Every label is a tag
 * from resources/call_types.json, shown exactly as written.
 */
export function CallTypeFilter({
  callTypes,
  selected,
  counts,
  onChange,
}: {
  callTypes: CallTypeGroup[];
  selected: CallTypeSelection;
  counts: OptionCounts;
  onChange: (selected: Set<string>) => void;
}) {
  // Open on wide screens, where the three groups sit side by side.
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const groups = callTypes.filter((group) => group.categories.length > 0);
  if (groups.length === 0) return null;
  const muted = (count: number) => (count === 0 ? "text-[#8a949d]" : "");

  return (
    <details
      data-call-type-filter
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group mt-3 rounded-xl border border-[#dfe3e8] bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold marker:content-none">
        <span>Filter</span>
        <span className="flex items-center gap-2">
          {selected.size > 0 && <span>{selected.size} selected</span>}
          <ChevronDown className="size-4 text-[#58636d] transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-x-6 gap-y-5 border-t border-[#e2e6ea] px-4 py-4 lg:grid-cols-3">
        {groups.map((group) => (
          <fieldset key={group.type} className="min-w-0">
            <label
              title={group.definition || undefined}
              className={`flex cursor-pointer items-start gap-2.5 border-b border-[#e2e6ea] pb-2.5 text-sm font-semibold leading-[1.4] text-[#164d73] ${muted(counts.byType[group.type])}`}
            >
              <TypeCheckbox
                state={typeState(selected, group)}
                onChange={() => onChange(toggleType(selected, group))}
              />
              <span className="min-w-0 break-words">{group.tag}</span>
              <Count value={counts.byType[group.type]} />
            </label>
            <ul className="mt-2.5 space-y-2">
              {group.categories.map((category) => (
                <li key={category.code}>
                  <label
                    title={category.definition || undefined}
                    className={`flex cursor-pointer items-start gap-2.5 text-sm leading-[1.4] ${muted(counts.byCategory[category.code])}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(category.code)}
                      onChange={() => onChange(toggleCategory(selected, category.code))}
                      className={checkboxClassName}
                    />
                    <span className="min-w-0 break-words">{category.tag}</span>
                    <Count value={counts.byCategory[category.code]} />
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
    </details>
  );
}
