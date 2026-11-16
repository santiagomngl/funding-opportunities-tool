import { tagsFor } from "../../build/call-type-tags.mjs";
import type { CallTypeGroup, FoRecord } from "@/lib/types.ts";

/**
 * How TenneT relates to a call, in the words of resources/call_types.json:
 * the type's tag once, then one tag per category. Shown exactly as written.
 */
export function CallTypeTags({
  record,
  callTypes,
  className = "",
}: {
  record: FoRecord;
  callTypes: CallTypeGroup[];
  className?: string;
}) {
  const { type, categories } = tagsFor(record, callTypes);
  if (!type && categories.length === 0) return null;
  const tagClassName = "max-w-full rounded-md px-2 py-1 text-xs leading-[1.4] break-words";
  return (
    <ul data-call-type-tags className={`flex flex-wrap gap-1.5 ${className}`}>
      {type && (
        <li title={type.definition || undefined} className={`${tagClassName} bg-[#e7f2fb] font-semibold text-[#164d73]`}>
          {type.tag}
        </li>
      )}
      {categories.map((category, index) => (
        <li
          key={index}
          title={category.definition || undefined}
          className={`${tagClassName} bg-[#eef1f4] font-medium text-[#27313a]`}
        >
          {category.tag}
        </li>
      ))}
    </ul>
  );
}
