// Shapes of the data that build/load-data.mjs bundles into the site.

export type Dimension = "topic" | "role" | "activity" | "outcome";
export const dimensions: Dimension[] = ["topic", "role", "activity", "outcome"];

export type TaxonomyEntry = { code: string; value: string; definition: string };
export type Taxonomy = Record<Dimension, TaxonomyEntry[]>;

/** One FO record, as the SA agent writes it (minus the fields the site never shows). */
export type FoRecord = {
  id: string;
  display_title: string;
  organization_or_parent_framework: string | null;
  programme: string | null;
  call_title: string;
  call_module_title: string | null;
  call_year: number | string | null;
  url: string | null;
  executive_summary: string | null;
  pre_submission_deadline: string | null;
  full_proposal_deadline: string | null;
  earliest_project_start_date: string | null;
  project_end_date: string | null;
  minimum_project_size: number | null;
  maximum_project_size: number | null;
  call_type: "Type 1" | "Type 2" | "Type 3";
  category_codes: string[];
  taxonomy_values: Record<Dimension, string[]>;
};

export type ReportCard = {
  title: string;
  question?: string | null;
  answer: string | null;
  sources: string | null;
};
export type ReportSection = { title: string; question?: string | null; cards: ReportCard[] };
/** One FO report: block name -> sections, as the RE agent writes it. */
export type FoReport = Record<string, ReportSection[]>;

/** One call type with its plain-language tag and its categories, from resources/call_types.json. */
export type CallTypeCategory = { code: string; tag: string; definition: string };
export type CallTypeGroup = { type: string; tag: string; definition: string; categories: CallTypeCategory[] };

export type Opportunity = { record: FoRecord; report: FoReport | null };

export type SiteData = {
  taxonomy: Taxonomy;
  callTypes: CallTypeGroup[];
  opportunities: Opportunity[];
};

/** The codes the user selected in questions 1 to 4. */
export type Selections = Record<Dimension, string[]>;
