// The address of each screen, kept in the part of the URL after "#", so the
// site stays one static file. The answers travel with it, which makes the
// browser's Back button, a refresh and a shared link all work.
//
//   #/questions/topic?t=T1.T5&b=2-8&s=2027Q3-2028Q3
//   #/results?t=T1.T5&r=R2&a=A4&o=O2&b=2-8&s=2027Q3-2028Q3&e=2029Q3-2031Q3
//   #/browse
//   #/opportunity/<id>            (with the answers when opened from results)

import {
  defaultAnswers,
  keepEndAfterStart,
  lastBudgetIndex,
  lastEndIndex,
  lastStartIndex,
  quarterOf,
  selectedCount,
  type Answers,
  type Range,
} from "./answers.ts";
import { dimensions, type Dimension } from "./types.ts";

export type Route =
  | { screen: "intro" }
  | { screen: "questions"; step: number }
  | { screen: "results" }
  | { screen: "browse" }
  /** `ranked`: opened from the results of a questionnaire, not from the full list. */
  | { screen: "opportunity"; id: string; ranked: boolean };

export type RouteContext = {
  /** The names of the questionnaire steps, in order. */
  steps: string[];
  /** The codes that exist, per dimension. */
  codes: Record<Dimension, string[]>;
  opportunityIds: string[];
  firstYear: number;
};

const keys: Record<Dimension, string> = { topic: "t", role: "r", activity: "a", outcome: "o" };

function quarterText(index: number, firstYear: number) {
  const { year, quarter } = quarterOf(index, firstYear);
  return `${year}Q${quarter}`;
}

function answersQuery(answers: Answers, firstYear: number) {
  const parts: string[] = [];
  for (const dimension of dimensions) {
    if (answers.selections[dimension].length > 0) {
      parts.push(`${keys[dimension]}=${answers.selections[dimension].map(encodeURIComponent).join(".")}`);
    }
  }
  parts.push(`b=${answers.budget[0]}-${answers.budget[1]}`);
  parts.push(`s=${quarterText(answers.start[0], firstYear)}-${quarterText(answers.start[1], firstYear)}`);
  if (answers.end) {
    parts.push(`e=${quarterText(answers.end[0], firstYear)}-${quarterText(answers.end[1], firstYear)}`);
  }
  return parts.join("&");
}

/** "" for the landing page; otherwise the text after the address, starting with "#". */
export function buildHash(route: Route, answers: Answers, context: RouteContext) {
  const query = answersQuery(answers, context.firstYear);
  switch (route.screen) {
    case "intro":
      return "";
    case "questions":
      return `#/questions/${context.steps[route.step] ?? context.steps[0]}?${query}`;
    case "results":
      return `#/results?${query}`;
    case "browse":
      return "#/browse";
    case "opportunity":
      return `#/opportunity/${encodeURIComponent(route.id)}${route.ranked ? `?${query}` : ""}`;
  }
}

function parseRange(text: string | null, read: (part: string) => number, last: number): Range | null {
  if (!text) return null;
  const parts = text.split("-");
  if (parts.length !== 2) return null;
  const [first, second] = parts.map(read);
  if (!Number.isInteger(first) || !Number.isInteger(second)) return null;
  const low = Math.min(Math.max(first, 0), last - 1);
  const high = Math.min(Math.max(second, low + 1), last);
  return [low, high];
}

function parseAnswers(query: string, context: RouteContext): Answers | null {
  if (!query) return null;
  const params = new URLSearchParams(query);
  const answers = defaultAnswers();
  for (const dimension of dimensions) {
    const wanted = (params.get(keys[dimension]) ?? "").split(".").filter(Boolean);
    // Only codes that still exist, in the order of the taxonomy file, each once.
    answers.selections[dimension] = context.codes[dimension].filter((code) => wanted.includes(code));
  }
  const quarterIndex = (part: string) => {
    const match = part.match(/^(\d{4})Q([1-4])$/);
    return match ? (Number(match[1]) - context.firstYear) * 4 + Number(match[2]) - 1 : NaN;
  };
  answers.budget = parseRange(params.get("b"), Number, lastBudgetIndex) ?? answers.budget;
  answers.start = parseRange(params.get("s"), quarterIndex, lastStartIndex) ?? answers.start;
  const end = parseRange(params.get("e"), quarterIndex, lastEndIndex);
  answers.end = end ? keepEndAfterStart(end, answers.start) : null;
  return answers;
}

/**
 * Reads an address. `answers` is null when the address carries none, and the
 * answers already on screen stay as they are.
 */
export function parseHash(hash: string, context: RouteContext): { route: Route; answers: Answers | null } {
  const text = hash.replace(/^#/, "");
  const known = (id: string | null) => (id && context.opportunityIds.includes(id) ? id : null);

  // The address format of earlier shared links: #opportunity=<id>.
  if (!text.startsWith("/")) {
    const id = known(new URLSearchParams(text).get("opportunity"));
    return { route: id ? { screen: "opportunity", id, ranked: false } : { screen: "intro" }, answers: null };
  }

  const [path, query = ""] = text.split("?");
  const [, screen, rest = ""] = path.split("/");
  const answers = parseAnswers(query, context);
  const ranked = answers !== null && selectedCount(answers.selections) > 0;

  if (screen === "questions") {
    const step = context.steps.indexOf(rest);
    return { route: { screen: "questions", step: Math.max(step, 0) }, answers };
  }
  if (screen === "results") {
    return { route: ranked ? { screen: "results" } : { screen: "browse" }, answers };
  }
  if (screen === "browse") return { route: { screen: "browse" }, answers: null };
  if (screen === "opportunity") {
    const id = known(decodeURIComponent(rest));
    if (!id) return { route: { screen: "browse" }, answers: null };
    return { route: { screen: "opportunity", id, ranked }, answers: ranked ? answers : null };
  }
  return { route: { screen: "intro" }, answers: null };
}
