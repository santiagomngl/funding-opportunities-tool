import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { tagsFor } from "../../build/call-type-tags.mjs";
import { focusRingClassName } from "@/components/styles.ts";
import type { CallTypeGroup, FoRecord } from "@/lib/types.ts";

type Props = { record: FoRecord; callTypes: CallTypeGroup[]; className?: string };

const tagClassName =
  "max-w-full rounded-md bg-[#eef1f4] px-2 py-1 text-xs font-medium leading-[1.4] break-words text-[#27313a]";

/**
 * How TenneT relates to a call, in the words of resources/call_types.json:
 * one tag per category of the record. Shown exactly as written.
 */
export function CallTypeTags({ record, callTypes, className = "" }: Props) {
  const { categories } = tagsFor(record, callTypes);
  if (categories.length === 0) return null;
  return (
    <ul data-call-type-tags className={`flex flex-wrap gap-1.5 ${className}`}>
      {categories.map((category, index) => (
        <li key={index} className={tagClassName}>
          {category.tag}
        </li>
      ))}
    </ul>
  );
}

/**
 * The tags and their definitions as one element: a tag opens the definition of
 * every category of the record (its `value` and `definition`, exactly as
 * written in resources/call_types.json) right below the tags.
 */
export function CallTypeInfo({ record, callTypes, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { categories } = tagsFor(record, callTypes);
  const defined = categories.filter((category) => category.definition);
  if (categories.length === 0) return null;
  if (defined.length === 0) return <CallTypeTags record={record} callTypes={callTypes} className={className} />;
  return (
    <div className={className}>
      <ul data-call-type-tags className="flex flex-wrap gap-1.5">
        {categories.map((category, index) => (
          <li key={index} className="max-w-full">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((current) => !current)}
              className={`${tagClassName} inline-flex min-h-[2rem] items-center gap-1.5 text-left transition-colors hover:bg-[#e2e8ed] ${focusRingClassName}`}
            >
              <span>{category.tag}</span>
              <ChevronDown
                className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              <span className="sr-only">{open ? "Hide what this means" : "Show what this means"}</span>
            </button>
          </li>
        ))}
      </ul>
      <div id={panelId} className="collapsible" data-open={open} inert={!open}>
        <div>
          <ul data-call-type-definitions className="max-w-4xl space-y-1 pt-2 text-sm leading-[1.45] text-[#27313a]">
            {defined.map((line, index) => (
              <li key={index}>
                {line.value && <span className="font-semibold">{line.value}: </span>}
                <span data-definition>{line.definition}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
