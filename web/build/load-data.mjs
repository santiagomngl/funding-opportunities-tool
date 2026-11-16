// Reads the agent data files and returns what the site needs.
//
// Used in two places, so both report the same problems:
//   - vite.config.ts, at build time (the result is bundled into the site);
//   - scripts/check-data.mjs, before pushing.
//
// A file the site cannot use is skipped and reported; it never stops the build.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { tagsFor } from "./call-type-tags.mjs";

export const DIMENSIONS = ["topic", "role", "activity", "outcome"];
export const CALL_TYPES = ["Type 1", "Type 2", "Type 3", "Not relevant"];
export const SIDE_BLOCK = "funding_timing_submission";
/** call_type -> the key of its category list in resources/call_types.json. */
export const CALL_TYPE_KEYS = { "Type 1": "type_1", "Type 2": "type_2", "Type 3": "type_3" };

// Used only when templates/fo_record.template.json cannot be read.
const FALLBACK_RECORD_KEYS = [
  "id", "source", "display_title", "organization_or_parent_framework", "programme",
  "call_title", "call_module_title", "call_year", "url", "executive_summary",
  "pre_submission_deadline", "full_proposal_deadline", "earliest_project_start_date",
  "project_end_date", "minimum_project_size", "maximum_project_size", "date_last_checked",
  "status_rationale", "call_type", "category_codes", "taxonomy_values",
];

// Fields the site never shows (internal judgement, bookkeeping and the executive summary); kept out of the bundle.
const NOT_BUNDLED = ["source", "status_rationale", "date_last_checked", "executive_summary"];

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const isTextOrNull = (v) => v === null || isText(v);

export function isIsoDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function jsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(dir, name));
}

/** Returns the problems that make a record unusable for the site, and softer remarks. */
export function inspectRecord(record, fileStem, requiredKeys) {
  const problems = [];
  const remarks = [];
  if (!isObject(record)) return { problems: ["the file must hold one JSON object"], remarks };

  const missing = requiredKeys.filter((key) => !(key in record));
  if (missing.length) return { problems: [`missing key(s): ${missing.join(", ")}`], remarks };

  if (record.id !== fileStem) problems.push(`id must equal the file name (${fileStem})`);
  if (!isText(record.display_title)) problems.push("display_title must be filled in");
  if (!CALL_TYPES.includes(record.call_type)) {
    problems.push("call_type must be exactly Type 1, Type 2, Type 3 or Not relevant");
  }
  for (const key of ["organization_or_parent_framework", "programme", "executive_summary"]) {
    if (!isTextOrNull(record[key])) problems.push(`${key} must be text or null`);
  }
  if (record.url !== null && !(isText(record.url) && /^https?:\/\//.test(record.url))) {
    problems.push("url must start with http:// or https://, or be null");
  }
  for (const key of [
    "pre_submission_deadline", "full_proposal_deadline",
    "earliest_project_start_date", "project_end_date",
  ]) {
    if (record[key] !== null && !isIsoDate(record[key])) {
      problems.push(`${key} must be an ISO date YYYY-MM-DD or null`);
    }
  }
  for (const key of ["minimum_project_size", "maximum_project_size"]) {
    const v = record[key];
    if (v !== null && !(Number.isInteger(v) && v > 0)) {
      problems.push(`${key} must be a whole number of euros or null`);
    }
  }
  if (!Array.isArray(record.category_codes) || !record.category_codes.every(isText)) {
    problems.push("category_codes must be a list of codes");
  }
  const tv = record.taxonomy_values;
  if (!isObject(tv) || !DIMENSIONS.every((d) => Array.isArray(tv[d]) && tv[d].every(isText))) {
    problems.push("taxonomy_values must hold the lists topic, role, activity and outcome");
  }

  const noDates = ["earliest_project_start_date", "project_end_date"].filter(
    (key) => record[key] === null,
  );
  if (noDates.length) {
    remarks.push(
      `null project date (${noDates.join(", ")}): the record fails the gate; the site still shows it, without the timing filter for that date`,
    );
  }
  return { problems, remarks };
}

/** Returns the problems that make a report unusable for the site. */
export function inspectReport(report) {
  if (!isObject(report)) return ["the file must hold one JSON object"];
  const blocks = Object.entries(report);
  if (blocks.length === 0) return ["the report holds no block"];
  const problems = [];
  for (const [blockKey, sections] of blocks) {
    if (!Array.isArray(sections)) {
      problems.push(`${blockKey} must be a list of sections`);
      continue;
    }
    sections.forEach((section, s) => {
      const where = `${blockKey}[${s}]`;
      if (!isObject(section) || !isText(section.title) || !Array.isArray(section.cards)) {
        problems.push(`${where} needs a title and a list of cards`);
        return;
      }
      if ("question" in section && !isTextOrNull(section.question)) {
        problems.push(`${where}.question must be text`);
      }
      section.cards.forEach((card, c) => {
        const at = `${where}.cards[${c}]`;
        if (!isObject(card) || !isText(card.title)) {
          problems.push(`${at} needs a title`);
          return;
        }
        if ("question" in card && !isTextOrNull(card.question)) {
          problems.push(`${at}.question must be text`);
        }
        for (const key of ["answer", "sources"]) {
          if (!(card[key] === null || typeof card[key] === "string")) {
            problems.push(`${at}.${key} must be text or null`);
          }
        }
      });
    });
  }
  return problems;
}

function loadCodeList(file, keys, label, warn) {
  const result = Object.fromEntries(keys.map((key) => [key, []]));
  let raw;
  try {
    raw = readJson(file);
  } catch (error) {
    warn(file, `cannot be read (${error.message}); the site has no ${label}`);
    return result;
  }
  for (const key of keys) {
    if (!isObject(raw) || !Array.isArray(raw[key])) {
      warn(file, `"${key}" must be a list; the site shows no ${label} for it`);
      continue;
    }
    raw[key].forEach((entry, index) => {
      if (isObject(entry) && isText(entry.code) && isText(entry.value)) {
        result[key].push({
          code: entry.code,
          value: entry.value,
          definition: typeof entry.definition === "string" ? entry.definition : "",
        });
      } else {
        warn(file, `${key}[${index}] needs a code and a value; entry skipped`);
      }
    });
  }
  return result;
}

/**
 * Reads resources/call_types.json: the categories of each call type, each with
 * its tag. A category without a tag is left out (no tag on the cards) and
 * reported.
 */
function loadCallTypes(file, warn) {
  let raw;
  try {
    raw = readJson(file);
  } catch (error) {
    warn(file, `cannot be read (${error.message}); the site shows no call-type tags`);
    return [];
  }
  const groups = [];
  const seenCodes = new Set();
  for (const [type, key] of Object.entries(CALL_TYPE_KEYS)) {
    const categories = [];
    if (!isObject(raw) || !Array.isArray(raw[key])) {
      warn(file, `"${key}" must be a list; the site shows no tags for ${type} calls`);
    } else {
      raw[key].forEach((category, index) => {
        if (!isObject(category) || !isText(category.code)) {
          warn(file, `${key}[${index}] needs a code; entry skipped`);
        } else if (!isText(category.tag)) {
          warn(file, `${key}: category ${category.code} has no tag; the site shows no tag for it`);
        } else if (seenCodes.has(category.code)) {
          warn(file, `${key}: category code ${category.code} appears more than once; the later entry is skipped`);
        } else {
          seenCodes.add(category.code);
          categories.push({
            code: category.code,
            tag: category.tag,
            value: isText(category.value) ? category.value : "",
            definition: typeof category.definition === "string" ? category.definition : "",
          });
        }
      });
    }
    groups.push({ type, categories });
  }
  return groups;
}

/**
 * @param {string} root the folder that holds data/, resources/ and templates/
 * @returns {{ data: object, warnings: { file: string, problem: string, soft?: boolean }[], counts: { shown: number, notRelevant: number } }}
 */
export function loadSiteData(root) {
  const warnings = [];
  // A soft warning is printed, but check-data does not count it as a failure.
  const warn = (file, problem, soft = false) =>
    warnings.push({
      file: path.relative(root, file).split(path.sep).join("/"),
      problem,
      ...(soft ? { soft } : {}),
    });

  const taxonomy = loadCodeList(
    path.join(root, "resources/tennet_taxonomy.json"), DIMENSIONS, "questionnaire options", warn,
  );
  const callTypes = loadCallTypes(path.join(root, "resources/call_types.json"), warn);

  let requiredKeys = FALLBACK_RECORD_KEYS;
  try {
    requiredKeys = Object.keys(readJson(path.join(root, "templates/fo_record.template.json")));
  } catch {
    // The template is the agents' file; the site can work without it.
  }

  const records = new Map();
  let notRelevant = 0;
  for (const file of jsonFiles(path.join(root, "data/fo_records"))) {
    let record;
    try {
      record = readJson(file);
    } catch (error) {
      warn(file, `not valid JSON (${error.message}); record skipped`);
      continue;
    }
    const { problems, remarks } = inspectRecord(record, path.basename(file, ".json"), requiredKeys);
    if (problems.length) {
      warn(file, `${problems.join("; ")}; record skipped`);
      continue;
    }
    remarks.forEach((remark) => warn(file, remark));
    if (record.call_type === "Not relevant") {
      notRelevant += 1;
      continue; // never shown, so never bundled
    }
    for (const code of tagsFor(record, callTypes).unknownCodes) {
      warn(
        file,
        `category code ${code} is not a ${record.call_type} category the site could load from resources/call_types.json; the card shows no tag for it`,
        true,
      );
    }
    const bundled = { ...record };
    NOT_BUNDLED.forEach((key) => delete bundled[key]);
    records.set(record.id, { record: bundled, report: null });
  }

  for (const file of jsonFiles(path.join(root, "data/fo_reports"))) {
    const id = path.basename(file, ".json");
    let report;
    try {
      report = readJson(file);
    } catch (error) {
      warn(file, `not valid JSON (${error.message}); report skipped`);
      continue;
    }
    const problems = inspectReport(report);
    if (problems.length) {
      warn(file, `${problems.join("; ")}; report skipped`);
      continue;
    }
    const entry = records.get(id);
    if (!entry) {
      warn(file, "no usable record with this file name in data/fo_records/ (missing, skipped or Not relevant); report skipped");
      continue;
    }
    entry.report = report;
  }

  return {
    data: { taxonomy, callTypes, opportunities: [...records.values()] },
    warnings,
    counts: { shown: records.size, notRelevant },
  };
}
