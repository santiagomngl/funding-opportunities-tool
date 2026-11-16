// How amounts and dates appear on screen. Amounts follow AGENT.md, writing guidelines, section 6:
// EUR 250,000; EUR 1.5 million; ranges as EUR 0.5–3 million.

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function decimals(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}

function unitOf(amount: number) {
  if (amount >= BILLION) return { divisor: BILLION, word: " billion" };
  if (amount >= MILLION) return { divisor: MILLION, word: " million" };
  return { divisor: 1, word: "" };
}

/** 250000 -> "EUR 250,000"; 1500000 -> "EUR 1.5 million". */
export function formatAmount(amount: number) {
  const { divisor, word } = unitOf(amount);
  return `EUR ${decimals(amount / divisor)}${word}`;
}

/** 500000, 3000000 -> "EUR 0.5–3 million". */
export function formatAmountRange(min: number, max: number) {
  if (min === max) return formatAmount(max);
  const { divisor, word } = unitOf(max);
  // Share the unit of the maximum when the minimum still reads well in it.
  if (divisor === 1 || min >= divisor / 10) {
    return `EUR ${decimals(min / divisor)}–${decimals(max / divisor)}${word}`;
  }
  return `${formatAmount(min)} – ${formatAmount(max)}`;
}

/** The project size line of a result card. */
export function formatProjectSize(min: number | null, max: number | null) {
  if (min !== null && max !== null) return formatAmountRange(min, max);
  if (max !== null) return `Up to ${formatAmount(max)}`;
  if (min !== null) return `At least ${formatAmount(min)}`;
  return "Not published";
}

/** "2027-03-11" -> "11 March 2027". */
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** "2027-02-01" -> "Feb 2027" (used in filter notes). */
export function formatMonthYear(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return `${MONTHS[month - 1].slice(0, 3)} ${year}`;
}

/** The project window line of a result card. */
export function formatProjectWindow(start: string | null, end: string | null) {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  if (end) return `Until ${formatDate(end)}`;
  return "Not published";
}

/** The submission lines of a result card, one per published deadline. */
export function formatSubmissionWindow(pre: string | null, full: string | null) {
  const lines: string[] = [];
  if (pre) lines.push(`Pre-submission: ${formatDate(pre)}`);
  if (full) lines.push(`Full proposal: ${formatDate(full)}`);
  return lines.length ? lines : ["No deadline published"];
}

/** True when the call published at least one deadline and all of them are before today. */
export function allDeadlinesPassed(pre: string | null, full: string | null, today: string) {
  const published = [pre, full].filter((d): d is string => d !== null);
  return published.length > 0 && published.every((d) => d < today);
}

/** Today's date in the browser's own time zone, as YYYY-MM-DD. */
export function localToday(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whole days from `today` to `iso` (both YYYY-MM-DD); negative when `iso` is in the past. */
export function daysUntil(iso: string, today: string) {
  const utc = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utc(iso) - utc(today)) / 86_400_000);
}

export type DeadlineStatus =
  | { kind: "open"; step: "Pre-submission" | "Full proposal"; date: string; days: number }
  | { kind: "closed" }
  | { kind: "none" };

/** The next deadline that has not passed; "closed" when all have; "none" when none is published. */
export function deadlineStatus(pre: string | null, full: string | null, today: string): DeadlineStatus {
  const steps = [
    { step: "Pre-submission" as const, date: pre },
    { step: "Full proposal" as const, date: full },
  ].filter((entry): entry is { step: "Pre-submission" | "Full proposal"; date: string } => entry.date !== null);
  if (steps.length === 0) return { kind: "none" };
  const next = steps.filter((entry) => entry.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return { kind: "closed" };
  return { kind: "open", step: next.step, date: next.date, days: daysUntil(next.date, today) };
}

/** "Closes today", "Closes tomorrow", "Closes in 122 days". */
export function closesIn(days: number) {
  if (days <= 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}

/**
 * How a title is shown: without the programme name the line above it already
 * gives, and with a leading call identifier (HORIZON-CL5-2027-07-D3-25) apart.
 * Display only; the record keeps its full title.
 */
export function splitTitle(displayTitle: string, programme: string | null) {
  let title = displayTitle.trim();
  if (programme) {
    const suffix = programme.trim().toLowerCase();
    const cut = title.match(/^(.*\S)\s+[–—-]\s+(.+)$/);
    if (suffix && cut && cut[2].trim().toLowerCase() === suffix) title = cut[1];
  }
  // An identifier starts in capitals, has at least three parts and holds a digit.
  const lead = title.match(/^([A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+){2,})\s+(\S.*)$/);
  return lead && /\d/.test(lead[1]) ? { callId: lead[1], title: lead[2] } : { callId: null, title };
}
