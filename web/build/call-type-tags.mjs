// The plain-language call-type tags of one FO record.
//
// Used in two places, so both agree on what a card shows:
//   - build/load-data.mjs, to warn about a code the site cannot show;
//   - the site (result cards and the detail page).
//
// The tag texts come from resources/call_types.json and are passed through
// exactly as written. Pure: no file access.

/**
 * @typedef {{ tag: string, definition: string }} Tag
 * @typedef {{ tag: string, value: string, definition: string }} CategoryTag
 * @typedef {{ code: string, tag: string, value?: string, definition: string }} CallTypeCategory
 * @typedef {{ type: string, tag: string, definition: string, categories: CallTypeCategory[] }} CallTypeGroup
 */

/**
 * The type's tag, then one category tag per code in `category_codes`, in that
 * order. A code that is not a category of the record's own type gets no tag
 * and is listed in `unknownCodes`.
 *
 * @param {{ call_type: string, category_codes: string[] }} record
 * @param {CallTypeGroup[]} callTypes
 * @returns {{ type: Tag | null, categories: CategoryTag[], unknownCodes: string[] }}
 */
export function tagsFor(record, callTypes) {
  const group = callTypes.find((entry) => entry.type === record.call_type);
  const categories = [];
  const unknownCodes = [];
  for (const code of record.category_codes) {
    const category = group?.categories.find((entry) => entry.code === code);
    if (category) categories.push({ tag: category.tag, value: category.value ?? "", definition: category.definition });
    else unknownCodes.push(code);
  }
  return {
    type: group ? { tag: group.tag, definition: group.definition } : null,
    categories,
    unknownCodes,
  };
}
