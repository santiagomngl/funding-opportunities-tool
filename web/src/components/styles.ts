/**
 * The width of the detail view. On wide screens it follows the page, with a
 * margin of 2.5% at each side, so the header and the two columns line up.
 */
export const detailContainerClassName =
  "mx-auto w-full max-w-[var(--tool-detail-width)] px-4 sm:px-8 lg:max-w-none lg:px-[2.5%]";

export const focusRingClassName =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]";

/**
 * Controls keep a height of at least 36 px on every screen. The desktop layout
 * is scaled down, and this size is deliberately left out of that scale.
 */
export const controlClassName = `inline-flex min-h-[2.25rem] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClassName}`;
export const outlineControlClassName = `${controlClassName} border border-[#d6dbe1] bg-white text-[#27313a] hover:border-[#aebbc6] hover:bg-[#f4f8fb]`;
export const ghostControlClassName = `${controlClassName} text-[#27313a] hover:bg-[#e7f2fb]`;
export const primaryControlClassName = `${controlClassName} bg-[#d8ecf9] font-semibold text-[#27313a] hover:bg-[#cce5f5] disabled:bg-[#eceff2]`;
export const iconControlClassName = `inline-flex size-[2.25rem] shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRingClassName}`;
