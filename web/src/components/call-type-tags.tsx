import { tagsFor } from "../../build/call-type-tags.mjs";
import type { CallTypeGroup, FoRecord } from "@/lib/types.ts";

type Props = { record: FoRecord; callTypes: CallTypeGroup[]; className?: string };

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
        <li
          key={index}
          title={category.definition || undefined}
          className="max-w-full rounded-md bg-[#eef1f4] px-2 py-1 text-xs font-medium leading-[1.4] break-words text-[#27313a]"
        >
          {category.tag}
        </li>
      ))}
    </ul>
  );
}

/**
 * The definitions behind the tags, from resources/call_types.json: one per
 * category, led by the category's `value`. Shown exactly as written, in full.
 */
export function CallTypeDefinitions({ record, callTypes, className = "" }: Props) {
  const lines = tagsFor(record, callTypes).categories.filter((category) => category.definition);
  if (lines.length === 0) return null;
  return (
    <ul data-call-type-definitions className={`space-y-1 text-sm leading-[1.45] text-[#27313a] ${className}`}>
      {lines.map((line, index) => (
        <li key={index}>
          {line.value && <span className="font-semibold">{line.value}: </span>}
          <span data-definition>{line.definition}</span>
        </li>
      ))}
    </ul>
  );
}
