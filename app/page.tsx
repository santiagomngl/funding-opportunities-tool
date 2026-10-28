"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCcw,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { OpportunityArticle } from "@/components/opportunity-article";
import { createArticleSections } from "@/lib/opportunity-article";
import cmFundingSidebarContent from "@/data/cm2026-01-funding-budget-timing-submission.md?raw";
import cmOperationalBrief from "@/data/cm2026-01-financial-operational-conditions.md?raw";
import foData from "@/data/funding-opportunities.json";

type Dimension = "role" | "activity" | "field" | "outcome";
type QuestionnaireStep = Dimension | "budget" | "timing";

type SpecificationKey =
  | "source"
  | "recurrence"
  | "timing"
  | "partnershipRequirements"
  | "financialSupport"
  | "otherConditions";

type TaxonomyDimension = {
  values: string[];
  analysis: string[];
};

type FundingOpportunity = {
  id: string;
  recordType: "provided" | "prototype";
  title: string;
  executiveSummary: string;
  specifications: Record<SpecificationKey, string[]>;
  projectTaxonomy: Record<Dimension, TaxonomyDimension> & {
    projectMatch: {
      title: string;
      context: string[];
      analysis: string[];
    };
  };
};

type SelectionMap = Record<Dimension, string[]>;

type OpportunityFacts = {
  projectSize: string;
  possibleFunding: string;
  submissionWindow: string;
  projectWindow: string;
  calendarStart: string;
  calendarEnd: string;
};

type BriefNode = {
  level: number;
  title: string;
  id: string;
  body: string[];
  children: BriefNode[];
};

type RichBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

type ContentGroup = {
  title: string | null;
  blocks: RichBlock[];
};

const sectionCardPalettes = [
  {
    frame: "border-[#c9e6d8] bg-[#f2fbf6] open:border-[#98d3b5]",
    hover: "hover:bg-[#edf8f2]",
    title: "text-[#116a4a]",
    icon: "bg-[#dff3e9] text-[#116a4a]",
    divider: "border-[#d7ece2]",
  },
  {
    frame: "border-[#c8dfea] bg-[#f3f8fb] open:border-[#9ec8dc]",
    hover: "hover:bg-[#edf5f9]",
    title: "text-[#164d73]",
    icon: "bg-[#dceef6] text-[#164d73]",
    divider: "border-[#d7e6ed]",
  },
  {
    frame: "border-[#c8e5e1] bg-[#f2faf9] open:border-[#9bd3cc]",
    hover: "hover:bg-[#edf7f6]",
    title: "text-[#17675f]",
    icon: "bg-[#dcf1ee] text-[#17675f]",
    divider: "border-[#d7ebe8]",
  },
  {
    frame: "border-[#d2dde6] bg-[#f5f8fb] open:border-[#aebfce]",
    hover: "hover:bg-[#eff4f7]",
    title: "text-[#173a52]",
    icon: "bg-[#e1eaf1] text-[#173a52]",
    divider: "border-[#dfe7ed]",
  },
] as const;

function getSectionCardPalette(index: number) {
  return sectionCardPalettes[index % sectionCardPalettes.length];
}

const opportunities = foData as FundingOpportunity[];
const cmBrief = parseBrief(cmOperationalBrief);
const cmFundingSidebar = parseBrief(cmFundingSidebarContent);

const opportunityFacts: Record<string, OpportunityFacts> = {
  "cm2026-01": {
    projectSize: "€2–5 million",
    possibleFunding: "Up to €400,000 or €600,000",
    submissionWindow: "8 January 2027 – 11 March 2027, 14:00 CET",
    projectWindow:
      "Must last no more than 36 months and should begin between September and December 2027.",
    calendarStart: "20270311T130000Z",
    calendarEnd: "20270311T140000Z",
  },
  "cm2026-08": {
    projectSize: "€1.5–5 million",
    possibleFunding: "Up to €450,000 or €650,000",
    submissionWindow: "8 January 2027 – 11 March 2027, 14:00 CET",
    projectWindow:
      "24–36 months, with an anticipated start between September and December 2027.",
    calendarStart: "20270311T130000Z",
    calendarEnd: "20270311T140000Z",
  },
  "kic-demand-s-2026": {
    projectSize: "€600,000–€1.8 million",
    possibleFunding: "€350,000–€1,050,000",
    submissionWindow: "15 June 2026 – 22 September 2026, 14:00 CEST",
    projectWindow:
      "Up to 6 years, with an anticipated start in the second half of 2027.",
    calendarStart: "20260922T120000Z",
    calendarEnd: "20260922T130000Z",
  },
  "perspectief-2026-2027": {
    projectSize: "€3–8 million",
    possibleFunding: "€2–5 million",
    submissionWindow: "15 February 2027 – 25 May 2027, 14:00 CEST",
    projectWindow: "Up to 6 years, with an expected start in early 2028.",
    calendarStart: "20270525T120000Z",
    calendarEnd: "20270525T130000Z",
  },
  "mooi-elektriciteit-2026": {
    projectSize: "At least €2 million",
    possibleFunding: "Up to €4 million",
    submissionWindow: "2 June 2026, 09:00 – 3 September 2026, 17:00 CEST",
    projectWindow: "3–5 years and must start within 6 months of the award.",
    calendarStart: "20260903T150000Z",
    calendarEnd: "20260903T160000Z",
  },
  "prototype-resilient-grid-operations": {
    projectSize: "€1–3 million",
    possibleFunding: "Up to €1.2 million",
    submissionWindow: "1 February 2027 – 30 April 2027, 17:00 CEST",
    projectWindow: "24–36 months and must start by January 2028.",
    calendarStart: "20270430T150000Z",
    calendarEnd: "20270430T160000Z",
  },
  "prototype-autonomous-offshore-inspection": {
    projectSize: "€750,000–€2.5 million",
    possibleFunding: "Up to €1 million",
    submissionWindow: "15 March 2027 – 30 June 2027, 17:00 CEST",
    projectWindow: "18–30 months and must start by March 2028.",
    calendarStart: "20270630T150000Z",
    calendarEnd: "20270630T160000Z",
  },
  "prototype-energy-data-spaces": {
    projectSize: "€1.5–4 million",
    possibleFunding: "Up to €2 million",
    submissionWindow: "4 January 2027 – 8 April 2027, 17:00 CEST",
    projectWindow: "24–42 months, with a planned start in late 2027.",
    calendarStart: "20270408T150000Z",
    calendarEnd: "20270408T160000Z",
  },
  "prototype-offshore-environmental-monitoring": {
    projectSize: "€900,000–€3 million",
    possibleFunding: "Up to €1.4 million",
    submissionWindow: "1 May 2027 – 31 August 2027, 17:00 CEST",
    projectWindow: "24–36 months and must start by April 2028.",
    calendarStart: "20270831T150000Z",
    calendarEnd: "20270831T160000Z",
  },
  "prototype-grid-flexibility-market": {
    projectSize: "€1–4.5 million",
    possibleFunding: "Up to €2.25 million",
    submissionWindow: "12 January 2027 – 18 May 2027, 17:00 CEST",
    projectWindow: "30–48 months and must start by February 2028.",
    calendarStart: "20270518T150000Z",
    calendarEnd: "20270518T160000Z",
  },
  "prototype-grid-connection-engineering": {
    projectSize: "€2–6 million",
    possibleFunding: "Up to €3 million",
    submissionWindow: "1 March 2027 – 15 July 2027, 17:00 CEST",
    projectWindow: "36–48 months and must start by June 2028.",
    calendarStart: "20270715T150000Z",
    calendarEnd: "20270715T160000Z",
  },
};

const taxonomy: Record<Dimension, string[]> = {
  role: [
    "Project Leadership or Consortium Coordination",
    "Project or Consortium Participation",
    "Procurement or Commissioning",
    "Supply or Contracted Delivery",
    "Co-development",
    "System Integration",
    "Market Design or Operation",
    "Standard Setting",
    "Data or Test-Environment Provision",
    "Research or Knowledge Contribution",
    "Sponsorship or Funding Provision",
    "Policy Advice, Advocacy or Dissemination",
  ],
  activity: [
    "Foundational or Exploratory Research",
    "Applied Research",
    "Feasibility or Concept Assessment",
    "Technical Design and Engineering",
    "Product or Prototype Development",
    "Software, Model or Data-System Development",
    "Pilot or Demonstration",
    "Testing, Validation or Certification",
    "Infrastructure Construction",
    "Technology Deployment",
    "Operational Improvement or Control",
    "Asset Inspection, Maintenance or Life Extension",
    "Policy, Strategy, Standards or Regulation Development",
    "Market, Contract or Flexibility Arrangement Development",
    "Planning or Permitting Improvement",
    "Partnership, Network or Consortium Development",
    "Training or Capacity Building",
  ],
  field: [
    "Digital, AI and Data Systems",
    "Automation, Robotics and Autonomous Systems",
    "Asset Monitoring, Inspection and Maintenance",
    "Grid Infrastructure and Transmission",
    "Grid Operation, Flexibility and Storage",
    "Electricity Markets and System Services",
    "Offshore and Renewable Energy Systems",
    "Security, Safety and Infrastructure Resilience",
    "Sustainability and Environmental Impact",
    "Energy Efficiency and Electrification",
  ],
  outcome: [
    "Health and safety",
    "Cyber and physical security",
    "Asset reliability and lifetime",
    "Operational readiness",
    "Environmental impact",
    "Cost and resource efficiency",
    "Connection capacity and delivery",
  ],
};

// Definitions describe the selectable vocabulary.
const optionDefinitions: Record<Dimension, Record<string, string>> = {
  field: {
    "Digital, AI and Data Systems":
      "Data infrastructure, analytics, AI, digital twins, software platforms, or other digital systems that are a substantive subject of the project.",
    "Automation, Robotics and Autonomous Systems":
      "Machines or systems that perform physical or operational tasks with automated, remote, or autonomous control.",
    "Asset Monitoring, Inspection and Maintenance":
      "Methods and systems for observing asset condition, identifying defects, inspecting infrastructure, and deciding or carrying out maintenance.",
    "Grid Infrastructure and Transmission":
      "The physical transmission network and its components, including cables, converters, substations, HVDC systems, connections, and interconnectors.",
    "Grid Operation, Flexibility and Storage":
      "The technical operation and control of the electricity system, including the use of flexibility or storage to manage grid conditions.",
    "Electricity Markets and System Services":
      "Market rules, trading and procurement arrangements, balancing services, congestion arrangements, and the provision of other system services.",
    "Offshore and Renewable Energy Systems":
      "Offshore energy generation and its integration into a wider energy system, including offshore wind interfaces and integrated offshore energy concepts.",
    "Security, Safety and Infrastructure Resilience":
      "Protection of people and critical infrastructure against hazards, security threats, failures, and disruptive events.",
    "Sustainability and Environmental Impact":
      "Environmental effects and practices, including marine ecology, emissions, material use, waste, and circularity.",
    "Energy Efficiency and Electrification":
      "Reducing energy required for a given service or replacing other energy uses with electricity.",
  },
  role: {
    "Project Leadership or Consortium Coordination":
      "TenneT takes responsibility for directing the project or coordinating the consortium, including its work, partners, and delivery.",
    "Project or Consortium Participation":
      "TenneT joins as a formal, non-leading project partner and takes responsibility for part of the work. This records its formal position; a more specific role can describe its contribution.",
    "Procurement or Commissioning":
      "TenneT specifies and commissions work, equipment, technology, or services that another organisation delivers.",
    "Supply or Contracted Delivery":
      "TenneT delivers goods, services, or contracted work to the project on behalf of another party.",
    "Co-development":
      "TenneT helps shape and create a new solution with other partners, making substantive decisions during development.",
    "System Integration":
      "TenneT brings components, technologies, data, or organisational contributions together and ensures they work as a coherent system.",
    "Market Design or Operation":
      "TenneT designs, implements, or operates an electricity-market or system-service arrangement, such as a balancing or congestion-management mechanism.",
    "Standard Setting":
      "TenneT helps define or agree technical, operational, or procedural rules intended for use across organisations or systems.",
    "Data or Test-Environment Provision":
      "TenneT provides data, access to infrastructure, a simulation setting, or an operational environment that others use to develop or test the solution.",
    "Research or Knowledge Contribution":
      "TenneT contributes analysis, specialist knowledge, evidence, or research expertise to inform the project’s work.",
    "Sponsorship or Funding Provision":
      "TenneT provides money or institutional backing without commissioning a specific deliverable or performing a principal project activity.",
    "Policy Advice, Advocacy or Dissemination":
      "TenneT contributes its perspective to policy or regulatory discussions, represents a position, or communicates project findings to relevant audiences.",
  },
  activity: {
    "Foundational or Exploratory Research":
      "Investigates principles, mechanisms, or possibilities to generate new knowledge without requiring an immediate practical solution.",
    "Applied Research":
      "Generates new knowledge to understand or solve a defined practical problem.",
    "Feasibility or Concept Assessment":
      "Examines options, requirements, expected benefits, and risks to decide whether and how a proposed solution should proceed.",
    "Technical Design and Engineering":
      "Turns an agreed concept into specifications, architectures, detailed designs, or engineering plans.",
    "Product or Prototype Development":
      "Builds or substantially improves a physical product, component, device, or prototype.",
    "Software, Model or Data-System Development":
      "Creates or substantially improves software, analytical models, algorithms, data pipelines, or digital platforms.",
    "Pilot or Demonstration":
      "Operates a solution on a limited scale or in a representative setting to show how it works in practice.",
    "Testing, Validation or Certification":
      "Checks a solution against defined requirements, performance criteria, or certification standards and produces evidence of the result.",
    "Infrastructure Construction":
      "Builds or materially upgrades physical grid or supporting infrastructure intended for continuing use.",
    "Technology Deployment":
      "Installs, integrates, or introduces a developed technology into practical use.",
    "Operational Improvement or Control":
      "Changes how an existing system is monitored, coordinated, controlled, or operated.",
    "Asset Inspection, Maintenance or Life Extension":
      "Assesses asset condition or carries out work to maintain, repair, refurbish, or extend the use of existing assets.",
    "Policy, Strategy, Standards or Regulation Development":
      "Creates or revises formal policies, strategies, standards, regulatory proposals, or governance frameworks.",
    "Market, Contract or Flexibility Arrangement Development":
      "Designs or changes the rules, contracts, incentives, or processes through which electricity, capacity, flexibility, or system services are organised.",
    "Planning or Permitting Improvement":
      "Improves the methods or processes used to plan, site, approve, or permit projects and infrastructure.",
    "Partnership, Network or Consortium Development":
      "Establishes or strengthens cooperation structures that are themselves part of the project’s work.",
    "Training or Capacity Building":
      "Develops people’s skills or an organisation’s ability to use, operate, or sustain the project’s results.",
  },
  outcome: {
    "Health and safety":
      "Reduces the risk of injury or harm to employees, contractors, or others involved in offshore work.",
    "Cyber and physical security":
      "Improves protection against cyberattacks, sabotage, unauthorised access, or other deliberate threats to assets, information, and operations.",
    "Asset reliability and lifetime":
      "Keeps existing offshore assets functioning, reduces failures or downtime, restores service faster, or extends their useful life.",
    "Operational readiness":
      "Ensures TenneT has the people, procedures, tools, materials, and arrangements needed to operate and maintain a new offshore system safely and reliably.",
    "Environmental impact":
      "Reduces harm to the climate or natural environment through lower emissions, pollution, waste, material use, or ecological disturbance.",
    "Cost and resource efficiency":
      "Delivers a defined level of performance using less money, labour, energy, materials, or logistical effort.",
    "Connection capacity and delivery":
      "Makes more offshore electricity transmission capacity available or brings new and upgraded connections into service sooner.",
  },
};

const dimensionMeta: Record<
  Dimension,
  { label: string; title: string; description: string }
> = {
  role: {
    label: "Role",
    title: "What will TenneT contribute to the project?",
    description: "Select every role that could apply to the project.",
  },
  activity: {
    label: "Activity",
    title: "What work will the project actually perform?",
    description: "Select every activity that applies to the project.",
  },
  field: {
    label: "Topic",
    title: "What’s your project about?",
    description: "Select every topic that is materially relevant.",
  },
  outcome: {
    label: "Outcome",
    title: "What improvement or change will this project deliver for TenneT?",
    description: "Select every intended project outcome.",
  },
};

const dimensions: Dimension[] = ["field", "role", "activity", "outcome"];
const interOperaTaxonomy: SelectionMap = {
  field: [
    "Grid Infrastructure and Transmission",
    "Offshore and Renewable Energy Systems",
  ],
  role: [
    "Project or Consortium Participation",
    "System Integration",
    "Standard Setting",
  ],
  activity: [
    "Technical Design and Engineering",
    "Software, Model or Data-System Development",
    "Pilot or Demonstration",
    "Testing, Validation or Certification",
    "Policy, Strategy, Standards or Regulation Development",
  ],
  outcome: ["Connection capacity and delivery", "Operational readiness"],
};
const hvdcRobotTaxonomy: SelectionMap = {
  field: [
    "Automation, Robotics and Autonomous Systems",
    "Asset Monitoring, Inspection and Maintenance",
    "Offshore and Renewable Energy Systems",
  ],
  role: [
    "System Integration",
    "Data or Test-Environment Provision",
    "Standard Setting",
  ],
  activity: [
    "Pilot or Demonstration",
    "Technology Deployment",
    "Operational Improvement or Control",
  ],
  outcome: ["Asset reliability and lifetime", "Cost and resource efficiency"],
};
const questionnaireSteps: QuestionnaireStep[] = [
  ...dimensions,
  "budget",
  "timing",
];

const preferenceMeta: Record<
  Exclude<QuestionnaireStep, Dimension>,
  { label: string; title: string }
> = {
  budget: {
    label: "Budget / Project Size",
    title: "What is the project's expected total budget?",
  },
  timing: {
    label: "Project Timing",
    title: "When could the project start?",
  },
};

const budgetStops = [
  10_000,
  25_000,
  50_000,
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
  10_000_000,
  25_000_000,
  50_000_000,
  100_000_000,
  250_000_000,
  500_000_000,
  1_000_000_000,
] as const;

const budgetPresets = [
  { label: "€10k–€100k", range: [0, 3] as [number, number] },
  { label: "€100k–€1m", range: [3, 6] as [number, number] },
  { label: "€1m–€5m", range: [6, 8] as [number, number] },
  { label: "€5m–€25m", range: [8, 10] as [number, number] },
  { label: "€25m–€100m", range: [10, 12] as [number, number] },
  { label: "€100m–€1,000m+", range: [12, 15] as [number, number] },
] as const;

const timingYears = [2026, 2027, 2028, 2029, 2030] as const;
const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;
const timingStops = timingYears.flatMap((year) =>
  quarters.map((quarter) => `${quarter} ${year}`),
);

const cmSourceFilename =
  "CETP_Joint-Call-2026-CallText_FINAL_v20260719.pdf";

const cmQuestionSourceReferences: Record<string, string> = {
  "Which problem or need must the project address?":
    "pp. 40–43 · CM2026-01 aim, challenges and scope",
  "How must collaboration be organised?":
    "pp. 22–23 & 39 · Consortium and Need Owner requirements",
  "What is TenneT’s position within the consortium?":
    "pp. 7, 22–23 & 39 · Self-financed partner, coordinator and Need Owner rules",
  "What type of innovation must the project develop?":
    "pp. 16, 25 & 39 · Innovation dimensions and CM2026-01 maturity guidance",
  "Which activities or work structure must the project cover?":
    "pp. 25, 41–43 & 96 · RDI, target topics and reporting work package",
  "In which environment must the project take place?":
    "pp. 40–43 · Integrated systems, threats and operating conditions",
  "How must the project scale, replicate or achieve uptake?":
    "pp. 18 & 42–43 · Exploitation, scalability and replication",
  "How must project deliver change?":
    "pp. 40 & 43–44 · Expected impacts and outcomes",
  "How much funding can the project receive?":
    "pp. 9, 24, 39 & 99 · Funding framework, project budget and NWO listing",
  "What is the project start date?":
    "pp. 11, 24 & 29–32 · Timeline, project window and submission stages",
  "How to submit a complete application?":
    "pp. 22–32 & 96 · Requirements, submission, evaluation and reporting package",
};

const cmCardSourceReferences: Record<string, string> = {
  "Central object": "pp. 40–43 · Aim, resilience cycle and scope",
  "Project type": "pp. 9 & 39 · Call purpose and CM2026-01 guidance",
  "Problem definition": "pp. 40–41 · Challenges and problem space",
  Scope: "pp. 41–43 · Scope and target topics",
  "Target user": "pp. 40 & 42–43 · Need Owners and intended users",
  "Public objectives alignment": "pp. 8–9 & 40 · Call and module objectives",
  "Minimum and maximum number of partners":
    "pp. 22–23 · Transnational consortium requirements",
  "Mandatory partners": "p. 39 · CM2026-01 Need Owner requirement",
  "Geographic distribution of partners":
    "pp. 22–23 · Country distribution requirements",
  "Coordinator or lead-applicant requirements":
    "pp. 22–23 · Coordinator and consortium rules",
  "Distribution of effort, budget and research":
    "pp. 22–23 & 96 · Effort limits and reporting allocation",
  "Required intensity of participation":
    "p. 39 · Need Owner participation by project maturity",
  "Eligibility to apply or coordinate":
    "pp. 7 & 22–23 · Partner and coordinator definitions",
  "Eligibility to receive funding":
    "p. 9 & Annex B p. 99 · National funding framework and NWO listing",
  "Participation without funding":
    "p. 7 & pp. 31–32 · Self-financed partners and commitments",
  "Required TenneT contribution":
    "pp. 39 & 42–43 · Need Owner and exploitation requirements",
  "Innovation threshold": "p. 27 & p. 43 · Excellence and complementarity",
  "Innovation object": "p. 16 & p. 43 · Dimensions of innovation",
  "Starting and target maturity": "pp. 25 & 39 · TRL guidance",
  "Permitted development stages": "pp. 25 & 39 · RDI and demonstration routes",
  "Mandatory, optional and excluded activities":
    "pp. 25, 41–43 & 96 · Scope and mandatory work package",
  "Integration of activities": "pp. 40–43 · Integrated resilience approach",
  "User participation": "pp. 39 & 42 · Need Owner participation",
  "Demonstration setting": "pp. 39 & 42–43 · Demonstration guidance",
  Evidence: "pp. 43–44 · Expected measurable outcomes",
  "Implementation and uptake": "pp. 18 & 42–43 · Exploitation strategy",
  "Physical, digital or regulatory systems":
    "pp. 40–43 · Integrated energy-system scope",
  "Operational conditions": "pp. 40–42 · Stressed and emergency conditions",
  "Safety, cybersecurity and data constraints":
    "pp. 41–43 · Human threats, cybersecurity and data protection",
  "Integration with existing systems":
    "pp. 40–43 · Multi-carrier integration and target topics",
  "Pilot or repeatable solution": "pp. 40 & 43 · Scalable, replicable solutions",
  "Replication target user": "pp. 40 & 42–43 · Users and uptake",
  "Timing of replication": "pp. 18 & 42–43 · Exploitation pathway",
  "Standardisation and interoperability":
    "pp. 17–18 & 42–43 · Integration and exploitation",
  "Application or market-introduction horizon":
    "pp. 18 & 42–43 · Readiness and market uptake",
  "Implementation model": "pp. 18 & 42–43 · Exploitation routes",
  "Knowledge utilisation and dissemination":
    "pp. 18, 42–43 & 96 · Exploitation and Knowledge Community",
  "Post-project adoption": "pp. 18 & 42–43 · Operational uptake",
  "Concrete outputs": "pp. 43–44 · Expected outcomes",
  "Operational effects": "pp. 40 & 43–44 · Resilience impacts",
  "System outcomes": "pp. 40 & 43–44 · System-level outcomes",
  "Wider impact": "pp. 40 & 43–44 · Overall expected impact",
  "How much money can be requested?":
    "pp. 9, 24 & 39 · Funding and project-budget guidance",
  "Who in the consortium receives the funding?":
    "p. 9 & Annex B p. 99 · National funding framework and NWO listing",
  "How should funding be distributed across the project budget?":
    "pp. 9 & 24; Annex B p. 99 · National budget rules and NWO listing",
  "Application route": "pp. 11 & 29–32 · Two-stage application route",
  "Project timing window": "p. 24 · Start date and maximum duration",
  "Required conditions before start date": "pp. 34–36 · Project implementation",
  "Pass or fail submission requirements":
    "pp. 22 & 29–32 · Eligibility and submission package",
  "Mandatory additional documents": "pp. 31–32 · Full-proposal requirements",
  "Conditional eligibility assessment (when applying with research organizations)":
    "Annex B p. 99 · NWO identified as Dutch funder",
  "Evaluation Criteria":
    "pp. 27–28 · Evaluation criteria and thresholds",
};

function plainHeading(text: string) {
  return text.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function cmSourceReference(context: string, cardTitle?: string | null) {
  if (cardTitle && cmCardSourceReferences[plainHeading(cardTitle)]) {
    return cmCardSourceReferences[plainHeading(cardTitle)];
  }

  return (
    cmQuestionSourceReferences[plainHeading(context)] ??
    "pp. 39–44 · CM2026-01 call-module text"
  );
}

const cmArticleSections = createArticleSections(
  cmBrief,
  cmFundingSidebar,
  groupQuestionContent,
  cmSourceReference,
);

function plainCardText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

function copyableBlocks(blocks: RichBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") return plainCardText(block.text);
      if (block.type === "list") {
        return block.items.map((item) => `- ${plainCardText(item)}`).join("\n");
      }
      return [block.headers, ...block.rows]
        .map((row) => row.map(plainCardText).join("\t"))
        .join("\n");
    })
    .join("\n\n");
}

function isDimensionStep(step: QuestionnaireStep): step is Dimension {
  return dimensions.includes(step as Dimension);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBudgetStop(value: number) {
  return value >= 1_000_000
    ? `€${new Intl.NumberFormat("en-IE").format(value / 1_000_000)} million`
    : formatEuro(value);
}

const emptySelections: SelectionMap = {
  role: [],
  activity: [],
  field: [],
  outcome: [],
};

function intersection(projectValues: string[], foValues: string[]) {
  if (foValues.includes("[All]")) return projectValues;
  return projectValues.filter((value) => foValues.includes(value));
}

function programmeLabel(fo: FundingOpportunity) {
  const source =
    fo.specifications.source.find((item) => item.startsWith("Programme:")) ??
    fo.specifications.source.find((item) => item.startsWith("Prototype record:")) ??
    fo.specifications.source[0] ??
    "Funding programme";
  const label = source.includes(":")
    ? source.split(":").slice(1).join(":")
    : source;
  return label.replace(/\.$/, "").trim();
}

function applicationUrl(fo: FundingOpportunity) {
  for (const item of fo.specifications.source) {
    const match = item.match(/https?:\/\/\S+/);
    if (match) return match[0].replace(/[),.;]+$/, "");
  }

  return null;
}

function matchOpportunity(fo: FundingOpportunity, selections: SelectionMap) {
  const activeDimensions = dimensions.filter(
    (dimension) => selections[dimension].length > 0,
  );

  const matches = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      intersection(
        selections[dimension],
        fo.projectTaxonomy[dimension].values,
      ),
    ]),
  ) as Record<Dimension, string[]>;

  const dimensionScores = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      selections[dimension].length
        ? matches[dimension].length / selections[dimension].length
        : 0,
    ]),
  ) as Record<Dimension, number>;

  const score = activeDimensions.length
    ? activeDimensions.reduce(
        (total, dimension) => total + dimensionScores[dimension],
        0,
      ) / activeDimensions.length
    : 0;

  const matchedCount = dimensions.reduce(
    (total, dimension) => total + matches[dimension].length,
    0,
  );

  return { fo, matches, dimensionScores, score, matchedCount };
}

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

type OpportunityMatch = ReturnType<typeof matchOpportunity>;

function taxonomyValueLabel(dimension: Dimension, value: string) {
  return dimension === "outcome"
    ? value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : value;
}

const definitionTooltipClassName =
  "rounded-xl border border-[#d5e3ee] bg-[#f4f9fd] px-3 py-2.5 text-sm leading-[1.45] text-[#27313a] shadow-[0_12px_32px_rgba(24,60,90,0.16)]";

function TaxonomyValueOption({
  label,
  description,
  selected,
  onToggle,
}: {
  label: string;
  description: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();

  return (
    <div
      className={`relative min-w-0 ${open ? "z-20" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-describedby={open ? descriptionId : undefined}
        onClick={onToggle}
        className={`group flex min-h-[var(--tool-option-height)] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea] ${
          selected
            ? "border-[#82b8dc] bg-[#e7f2fb]"
            : "border-[#d8dde2] bg-white hover:border-[#aebbc6]"
        }`}
      >
        <span className="text-base font-medium leading-[1.5]">{label}</span>
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-full border ${
            selected
              ? "border-[#82b8dc] bg-[#d5eaf8]"
              : "border-[#cbd1d8] bg-white"
          }`}
        >
          <Check className={`size-3.5 ${selected ? "opacity-100" : "opacity-0"}`} />
        </span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-40 w-full max-w-96 pb-1">
          <div
            id={descriptionId}
            role="tooltip"
            className={definitionTooltipClassName}
          >
            {description}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectExamplesHelp({ dimension }: { dimension: Dimension }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative z-30 w-fit max-w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="project-examples-panel"
        onClick={() => setOpen(true)}
        className="flex max-w-full items-center gap-2 rounded-lg border border-[#c9ddea] bg-white px-3 py-2 text-left text-sm font-medium text-[#286a99] shadow-sm hover:bg-[#f5faff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
      >
        <span>How do other projects fit into this?</span>
        <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div
          id="project-examples-panel"
          className="absolute left-0 top-full z-40 w-[min(var(--tool-examples-width),calc(100vw-2rem))] max-h-[min(32rem,calc(100vh-8rem))] overflow-y-auto rounded-xl border border-[#d5e3ee] bg-white p-4 shadow-[0_12px_32px_rgba(24,60,90,0.16)] sm:p-5"
        >
          <p className="text-xs font-semibold text-[#27313a]">Examples from TenneT</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 border-b border-[#e4ebf1] pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
              <h2 className="text-base font-semibold text-[#2475a8]">InterOPERA</h2>
              <dl className="mt-2 text-[13px] leading-[1.5]">
                <dt className="text-[#64788b]">{dimensionMeta[dimension].label}</dt>
                <dd className="mt-1 min-w-0 text-[#27313a]">
                  <ul className="list-disc space-y-1 pl-5">
                    {interOperaTaxonomy[dimension].map((value) => (
                      <li key={value}>{taxonomyValueLabel(dimension, value)}</li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#2475a8]">HVDC Converter Hall Robot</h2>
              <dl className="mt-2 text-[13px] leading-[1.5]">
                <dt className="text-[#64788b]">{dimensionMeta[dimension].label}</dt>
                <dd className="mt-1 min-w-0 text-[#27313a]">
                  <ul className="list-disc space-y-1 pl-5">
                    {hvdcRobotTaxonomy[dimension].map((value) => (
                      <li key={value}>{taxonomyValueLabel(dimension, value)}</li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"intro" | "profile" | "results">("intro");
  const [selections, setSelections] = useState<SelectionMap>(emptySelections);
  const [budgetRange, setBudgetRange] = useState<[number, number]>([2, 8]);
  const [budgetPreset, setBudgetPreset] = useState<string | null>(null);
  const [timingRange, setTimingRange] = useState<[number, number]>([6, 10]);
  const [selectedFo, setSelectedFo] = useState<FundingOpportunity | null>(null);
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCanUseFullscreen(document.fullscreenEnabled);

    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  const currentStep = questionnaireSteps[step];
  const currentStepIsDimension = isDimensionStep(currentStep);
  const currentDimension = currentStepIsDimension ? currentStep : null;
  const currentMeta = currentStepIsDimension
    ? dimensionMeta[currentStep]
    : preferenceMeta[currentStep];
  const totalSelected = dimensions.reduce(
    (total, dimension) => total + selections[dimension].length,
    0,
  );

  const rankedMatches = useMemo(
    () =>
      opportunities
        .map((fo) => matchOpportunity(fo, selections))
        .filter((match) => match.matchedCount > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.matchedCount - a.matchedCount ||
            Number(b.fo.recordType === "provided") -
              Number(a.fo.recordType === "provided") ||
            a.fo.title.localeCompare(b.fo.title),
        ),
    [selections],
  );

  function toggleValue(dimension: Dimension, value: string) {
    setSelections((current) => ({
      ...current,
      [dimension]: current[dimension].includes(value)
        ? current[dimension].filter((item) => item !== value)
        : [...current[dimension], value],
    }));
  }

  function resetProfile() {
    setSelections(emptySelections);
    setBudgetRange([2, 8]);
    setBudgetPreset(null);
    setTimingRange([6, 10]);
    setStep(0);
    setMode("intro");
    setSelectedFo(null);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Full-screen requests can be blocked by browser or presentation policy.
    }
  }

  return (
    <main className="minimal-ui min-h-screen bg-[#f6f7f9] text-[#27313a]">
      <header className="bg-[#f6f7f9]">
        <div className="mx-auto flex min-h-24 max-w-[var(--tool-header-width)] items-center gap-3 px-4 py-4 sm:gap-4 sm:px-7">
          <span
            aria-hidden="true"
            className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
          />
          <p className="desk-brand-title min-w-0 text-xl font-extrabold leading-tight tracking-[-0.035em] sm:text-3xl">
            Innovation Funding Desk
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={!canUseFullscreen}
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            aria-pressed={isFullscreen}
            onClick={toggleFullscreen}
            className="ml-auto h-9 w-9 shrink-0 rounded-lg border-[#d6dbe1] bg-white p-0 text-sm shadow-none hover:bg-[#f4f8fb] disabled:hidden"
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[var(--tool-content-width)] px-4 py-6 sm:px-7 sm:py-8">
        <section className="min-w-0">
          {mode === "intro" ? (
            <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-12 text-center">
              <div className="max-w-full">
                <span className="inline-flex rounded-full border border-[#9bccea] bg-[#f7fbfe] px-4 py-1.5 text-sm font-semibold">
                  6 questions
                </span>
                <h1 className="landing-title mx-auto mt-7 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  How does your innovation look like?
                </h1>
                <p className="mx-auto mt-5 text-lg leading-[1.35]">
                  Define the characteristics — we’ll rank in seconds the funding opportunities that match them.
                </p>
                <Button
                  type="button"
                  onClick={() => setMode("profile")}
                  className="mt-9 h-14 rounded-xl bg-[#d8ecf9] px-7 text-base font-semibold shadow-none hover:bg-[#cce5f5]"
                >
                  Start <ArrowRight />
                </Button>
              </div>
            </div>
          ) : mode === "profile" ? (
            <div className="mx-auto max-w-5xl pb-8">
              {currentDimension && (
                <div className="mb-5">
                  <ProjectExamplesHelp dimension={currentDimension} />
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span>Question {step + 1} of {questionnaireSteps.length}</span>
                  <span className="border-l border-[#cbd7e0] pl-3 font-semibold text-[#164d73]">
                    {currentMeta.label}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={resetProfile}
                  className="rounded-md px-2 py-1 underline decoration-[#9bccea] underline-offset-4"
                >
                  Start over
                </button>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8ebef]"
                role="progressbar"
                aria-label="Questionnaire progress"
                aria-valuemin={0}
                aria-valuemax={questionnaireSteps.length - 1}
                aria-valuenow={step}
              >
                <div
                  className="h-full rounded-full bg-[#2780b8] transition-[width] duration-300"
                  style={{
                    width: `${(step / (questionnaireSteps.length - 1)) * 100}%`,
                  }}
                />
              </div>

              <div className="mx-auto mt-8 text-center sm:mt-10">
                <h1 className="mx-auto max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  {currentMeta.title}
                </h1>
                {currentDimension && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        selections[currentDimension].length ===
                        taxonomy[currentDimension].length
                      }
                      onClick={() =>
                        setSelections((current) => ({
                          ...current,
                          [currentDimension]: [...taxonomy[currentDimension]],
                        }))
                      }
                      className="h-9 rounded-lg border-[#d6dbe1] bg-white px-3 text-sm shadow-none disabled:bg-[#f0f2f4]"
                    >
                      {selections[currentDimension].length ===
                      taxonomy[currentDimension].length
                        ? "All selected"
                        : "Select all"}
                    </Button>
                    {selections[currentDimension].length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSelections((current) => ({
                            ...current,
                            [currentDimension]: [],
                          }))
                        }
                        className="h-9 rounded-lg px-3 text-sm"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {currentDimension ? (
                <div className="mt-6 grid items-start gap-2.5 sm:grid-cols-2">
                  {taxonomy[currentDimension].map((value) => (
                    <TaxonomyValueOption
                      key={value}
                      label={taxonomyValueLabel(currentDimension, value)}
                      description={optionDefinitions[currentDimension][value]}
                      selected={selections[currentDimension].includes(value)}
                      onToggle={() => toggleValue(currentDimension, value)}
                    />
                  ))}
                </div>
              ) : currentStep === "budget" ? (
                <BudgetPreference
                  range={budgetRange}
                  preset={budgetPreset}
                  onRangeChange={(range) => {
                    setBudgetRange(range);
                    setBudgetPreset(null);
                  }}
                  onPresetChange={(label, range) => {
                    setBudgetPreset(label);
                    setBudgetRange(range);
                  }}
                />
              ) : (
                <TimingPreference
                  range={timingRange}
                  onRangeChange={setTimingRange}
                />
              )}

              <div className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="h-11 rounded-lg px-3 text-base"
                >
                  <ArrowLeft /> Back
                </Button>
                <Button
                  type="button"
                  disabled={
                    currentDimension
                      ? selections[currentDimension].length === 0
                      : false
                  }
                  onClick={() => {
                    if (step === questionnaireSteps.length - 1)
                      setMode("results");
                    else setStep((current) => current + 1);
                  }}
                  className="h-11 rounded-lg bg-[#d8ecf9] px-5 text-base shadow-none hover:bg-[#cce5f5] disabled:bg-[#eceff2]"
                >
                  {step === questionnaireSteps.length - 1
                    ? "Find opportunities"
                    : "Continue"}
                  <ArrowRight />
                </Button>
              </div>
            </div>
          ) : (
            <Results
              rankedMatches={rankedMatches}
              selections={selections}
              totalSelected={totalSelected}
              onEdit={() => setMode("profile")}
              onReset={resetProfile}
              onSelectFo={setSelectedFo}
            />
          )}
        </section>

      </div>

      <OpportunitySheet
        selectedFo={selectedFo}
        onClose={() => setSelectedFo(null)}
      />
    </main>
  );
}

function BudgetPreference({
  range,
  preset,
  onRangeChange,
  onPresetChange,
}: {
  range: [number, number];
  preset: string | null;
  onRangeChange: (range: [number, number]) => void;
  onPresetChange: (label: string, range: [number, number]) => void;
}) {
  return (
    <PreferenceRangeCard
      chips={budgetPresets.map((item) => item.label)}
      selectedChip={preset}
      onChipSelect={(label) => {
        const selected = budgetPresets.find((item) => item.label === label);
        if (selected) onPresetChange(selected.label, [...selected.range]);
      }}
      range={range}
      maxIndex={budgetStops.length - 1}
      onRangeChange={onRangeChange}
      minLabel="Minimum budget"
      maxLabel="Maximum budget"
      minValue={formatBudgetStop(budgetStops[range[0]])}
      maxValue={`${formatBudgetStop(budgetStops[range[1]])}${range[1] === budgetStops.length - 1 ? "+" : ""}`}
      ariaLabel="Project budget range"
    />
  );
}

function TimingPreference({
  range,
  onRangeChange,
}: {
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
}) {
  return (
    <PreferenceRangeCard
      range={range}
      maxIndex={timingStops.length - 1}
      onRangeChange={onRangeChange}
      showQuarterScale
      minLabel="Earliest start"
      maxLabel="Latest start"
      minValue={timingStops[range[0]]}
      maxValue={timingStops[range[1]]}
      ariaLabel="Project start window"
    />
  );
}

function PreferenceRangeCard({
  chips,
  selectedChip,
  onChipSelect,
  range,
  maxIndex,
  onRangeChange,
  showQuarterScale = false,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  ariaLabel,
}: {
  chips?: string[];
  selectedChip?: string | null;
  onChipSelect?: (label: string) => void;
  range: [number, number];
  maxIndex: number;
  onRangeChange: (range: [number, number]) => void;
  showQuarterScale?: boolean;
  minLabel: string;
  maxLabel: string;
  minValue: string;
  maxValue: string;
  ariaLabel: string;
}) {
  return (
    <section className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#dce3e9] bg-white p-4 text-left shadow-sm sm:p-6">
      {chips && onChipSelect && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#46535e]">Quick ranges</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {chips.map((chip) => {
              const isSelected = chip === selectedChip;
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChipSelect(chip)}
                  className={`min-h-9 rounded-lg border px-2 py-1.5 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fc6e7] ${
                    isSelected
                      ? "border-[#70afd3] bg-[#dceefa] text-[#164d73]"
                      : "border-[#e0e5e9] bg-[#f5f7f9] text-[#27313a] hover:bg-[#eaf1f6]"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-2 sm:px-3">
        <Slider
          className="preference-slider"
          aria-label={ariaLabel}
          min={0}
          max={maxIndex}
          step={1}
          minStepsBetweenThumbs={1}
          value={range}
          onValueChange={(values) =>
            onRangeChange([values[0] ?? range[0], values[1] ?? range[1]])
          }
        />
        {showQuarterScale && (
          <div className="mt-1 grid grid-cols-5 text-center text-xs text-[#61717d]">
            {timingYears.map((year) => (
              <div key={year} className="min-w-0">
                <div className="grid grid-cols-4">
                  {quarters.map((quarter) => (
                    <span key={quarter}>{quarter}</span>
                  ))}
                </div>
                <span className="font-semibold">{year}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-[#d3d9df] bg-white px-3 py-2.5">
          <p className="text-sm font-semibold text-[#68737d]">
            {minLabel}
          </p>
          <p className="mt-1 break-words text-base font-semibold tracking-[-0.02em] sm:text-lg">
            {minValue}
          </p>
        </div>
        <div className="rounded-lg border border-[#d3d9df] bg-white px-3 py-2.5 text-right">
          <p className="text-sm font-semibold text-[#68737d]">
            {maxLabel}
          </p>
          <p className="mt-1 break-words text-base font-semibold tracking-[-0.02em] sm:text-lg">
            {maxValue}
          </p>
        </div>
      </div>
    </section>
  );
}

function Results({
  rankedMatches,
  selections,
  totalSelected,
  onEdit,
  onReset,
  onSelectFo,
}: {
  rankedMatches: OpportunityMatch[];
  selections: SelectionMap;
  totalSelected: number;
  onEdit: () => void;
  onReset: () => void;
  onSelectFo: (fo: FundingOpportunity) => void;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe3e8] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Your funding opportunity matches
          </h1>
          <p className="mt-3 text-base leading-[1.5]">
            Explore funding opportunities ranked by their alignment with your project’s selected characteristics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="rounded-lg border-[#d6dbe1] bg-white shadow-none"
          >
            <ArrowLeft /> Edit profile
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="rounded-lg"
          >
            <RotateCcw /> Reset
          </Button>
        </div>
      </div>

      <details className="group mt-5 rounded-xl border border-[#dfe3e8] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold marker:content-none">
          <span>Selected profile</span>
          <span>{totalSelected} values</span>
        </summary>
        <div className="flex flex-wrap gap-1.5 border-t border-[#e2e6ea] px-4 py-4">
          {dimensions.flatMap((dimension) =>
            selections[dimension].map((value) => (
              <span
                key={`${dimension}-${value}`}
                className="rounded-full bg-[#eef1f4] px-2.5 py-1 text-xs font-medium"
              >
                <span className="font-semibold">
                  {dimensionMeta[dimension].label} ·{" "}
                </span>
                {value}
              </span>
            )),
          )}
        </div>
      </details>

      <TooltipProvider delayDuration={0}>
      <div className="mt-5 space-y-3">
        {rankedMatches.map((match) => {
          const facts = opportunityFacts[match.fo.id];

          return (
            <article
              key={match.fo.id}
              className="overflow-hidden rounded-xl border border-[#d7dde2] bg-white transition-colors hover:border-[#80badc] hover:bg-[#f4f9fd]"
            >
              <button
                type="button"
                onClick={() => onSelectFo(match.fo)}
                className="group relative w-full cursor-pointer px-5 pb-16 pt-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9bccea] sm:px-6 sm:pb-6 sm:pr-20"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-[1.45] text-[#58636d]">
                      {programmeLabel(match.fo)}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold uppercase leading-[1.55] tracking-[-0.015em] text-[#164d73] sm:text-2xl sm:leading-[1.35]">
                      {match.fo.title}
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      aria-label={`${percentage(match.score)} taxonomy overlap`}
                      className={`shrink-0 rounded-lg px-3 py-2 text-lg font-semibold tabular-nums ${
                        match.score >= 0.5
                          ? "bg-[#e7f5ed] text-[#176b46]"
                          : "bg-[#fbeaea] text-[#a13a3a]"
                      }`}
                    >
                      {percentage(match.score)}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          aria-label="How the match percentage is calculated"
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f2f6f9] text-[#5e6973]"
                        >
                          <CircleHelp className="size-5" strokeWidth={1.9} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        sideOffset={4}
                        className={`${definitionTooltipClassName} w-80 max-w-[calc(100vw-2rem)] animate-none text-left font-normal text-wrap [&>svg]:hidden`}
                      >
                        The matching percentage shows how closely a funding opportunity aligns with the project characteristics selected in the questionnaire.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <dl className="mt-5 grid gap-x-7 gap-y-4 border-t border-[#e1e6ea] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#164d73]">
                      Project size
                    </dt>
                    <dd className="mt-1.5 text-sm leading-[1.45] text-[#58636d]">
                      {facts.projectSize}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#164d73]">
                      Possible funding
                    </dt>
                    <dd className="mt-1.5 text-sm leading-[1.45] text-[#58636d]">
                      {facts.possibleFunding}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#164d73]">
                      Project window
                    </dt>
                    <dd className="mt-1.5 text-sm leading-[1.45] text-[#58636d]">
                      {facts.projectWindow}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.06em] text-[#164d73]">
                      Proposal submission window
                    </dt>
                    <dd className="mt-1.5 text-sm leading-[1.45] text-[#58636d]">
                      {facts.submissionWindow}
                    </dd>
                  </div>
                </dl>

                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 grid size-13 place-items-center rounded-tl-[1.65rem] bg-[#164d73] text-white transition-colors group-hover:bg-[#0f638d]"
                >
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </article>
          );
        })}

        {rankedMatches.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#c6ccd2] bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">No overlapping opportunities</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-[1.5]">
              None of the records share a selected taxonomy value. Edit the
              profile to broaden the comparison.
            </p>
          </div>
        )}
      </div>
      </TooltipProvider>
    </div>
  );
}

function OpportunitySheet({
  selectedFo,
  onClose,
}: {
  selectedFo: FundingOpportunity | null;
  onClose: () => void;
}) {
  const hasOperationalBrief = selectedFo?.id === "cm2026-01";
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [detailView, setDetailView] = useState<"cards" | "article">("cards");

  function closeSheet() {
    setShareStatus("idle");
    setDetailView("cards");
    onClose();
  }

  async function shareOpportunity(fo: FundingOpportunity) {
    const url = window.location.href;
    const shareData = {
      title: fo.title,
      text: `Review the taxonomy brief for ${fo.title}.`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${fo.title}\n${url}`);
        setShareStatus("copied");
        window.setTimeout(() => setShareStatus("idle"), 2200);
        return;
      }

      window.prompt("Copy this brief link", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${fo.title}\n${url}`);
        setShareStatus("copied");
        window.setTimeout(() => setShareStatus("idle"), 2200);
      }
    }
  }

  return (
    <Sheet
      open={Boolean(selectedFo)}
      onOpenChange={(open) => !open && closeSheet()}
    >
      <SheetContent
        className="minimal-sheet inset-y-0 left-0 right-0 flex h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden border-0 bg-white p-0 text-[#27313a] shadow-none sm:max-w-none"
      >
        {selectedFo && (
          <>
            <SheetHeader className="border-b border-[#dfe3e8] bg-white px-5 py-5 pr-14 sm:px-8 sm:py-6">
              <div className="mx-auto flex w-full max-w-[var(--tool-detail-width)] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-[1.45] text-[#58636d]">
                    {programmeLabel(selectedFo)}
                  </p>
                  <SheetTitle className="mt-2 max-w-5xl text-2xl font-semibold leading-[1.35] tracking-[-0.03em] text-[#27313a] sm:text-3xl sm:leading-[1.35]">
                    {selectedFo.title}
                  </SheetTitle>
                  <button
                    type="button"
                    onClick={() => setDetailView((current) => current === "cards" ? "article" : "cards")}
                    aria-label={detailView === "cards" ? "Change to Article View" : "Change to Card View"}
                    className="mt-3 rounded-lg border border-[#afd8d1] bg-[#d9eee9] px-3 py-2 text-sm font-semibold text-[#175e55] transition-colors hover:bg-[#cce7e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#83c6ba]"
                  >
                    {detailView === "cards" ? "Change to Article View" : "Change to Card View"}
                  </button>
                </div>
                <ProposalActions
                  opportunity={selectedFo}
                  onShare={() => shareOpportunity(selectedFo)}
                  shareStatus={shareStatus}
                />
              </div>
            </SheetHeader>

            {hasOperationalBrief ? (
              <>
                <div className={`${detailView === "cards" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
                  <OperationalBrief />
                </div>
                <div className={`${detailView === "article" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
                  <OpportunityArticle
                    sections={cmArticleSections}
                    sourceFilename={cmSourceFilename}
                    active={detailView === "article"}
                    renderBlocks={(blocks, reference) => (
                      <RichContentBlocks blocks={blocks} compact={false} trailingReference={reference} />
                    )}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="mx-auto min-h-full max-w-[var(--tool-detail-width)] px-5 py-7 sm:px-8 sm:py-9" aria-label="No operational brief available" />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProposalActions({
  opportunity,
  onShare,
  shareStatus,
}: {
  opportunity: FundingOpportunity;
  onShare: () => void;
  shareStatus: "idle" | "copied";
}) {
  const applyUrl = applicationUrl(opportunity);

  return (
    <aside className="shrink-0 self-start lg:self-end" aria-label="Proposal actions">
      <div className="flex items-center gap-2">
        {applyUrl ? (
          <a
            href={applyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-9 items-center justify-between gap-2 rounded-lg bg-[#18734d] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#125f3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fcbb3]"
          >
            <span>Apply</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="An application link is not available for this prototype opportunity."
            className="flex min-h-9 cursor-not-allowed items-center justify-between gap-2 rounded-lg bg-[#18734d] px-3 py-2 text-sm font-semibold text-white opacity-55"
          >
            <span>Apply</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </button>
        )}
        <button
          type="button"
          onClick={onShare}
          className="flex min-h-9 items-center justify-between gap-2 rounded-lg bg-[#164d73] px-3 py-2 text-left text-sm font-semibold text-white transition-colors hover:bg-[#103e5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
        >
          <span>{shareStatus === "copied" ? "Link copied" : "Share"}</span>
          {shareStatus === "copied" ? (
            <Check className="size-3.5 shrink-0" />
          ) : (
            <Share2 className="size-3.5 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}

function OperationalBrief() {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto grid max-w-[var(--tool-detail-width)] gap-8 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[var(--tool-sidebar-width)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[var(--tool-sidebar-wide-width)_minmax(0,1fr)]">
        <FundingSidebar />

        <article className="min-w-0 pb-16 lg:col-start-2">
          {cmBrief.map((node) => (
            <BriefSection key={node.id} node={node} />
          ))}
        </article>
      </div>
    </div>
  );
}

function FundingSidebar() {
  const sections = cmFundingSidebar;

  if (sections.length === 0) return null;

  return (
    <aside className="min-w-0 self-start break-words lg:col-start-1 lg:row-start-1 xl:sticky xl:top-8 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
      <div className="overflow-hidden rounded-xl border border-[#dfe3e8] bg-white">
        <div className="grid gap-3 bg-[#f8fbfd] p-3">
          {sections.map((section, index) => {
            const palette = getSectionCardPalette(index);

            return (
              <details
                key={section.id}
                className={`group/sidebar-section overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(26,48,65,0.035)] transition-colors ${palette.frame}`}
              >
                <summary
                  className={`flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 marker:content-none transition-colors ${palette.hover}`}
                >
                  <h3 className="min-w-0 text-sm font-semibold leading-[1.45] text-black">
                    <FundingSidebarTitle title={section.title} />
                  </h3>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${palette.icon}`}>
                    <ChevronDown className="size-4 transition-transform duration-200 group-open/sidebar-section:rotate-180" />
                  </span>
                </summary>
                <div className={`border-t bg-white/75 p-3 ${palette.divider}`}>
                  <QuestionContent
                    lines={section.body}
                    compact
                    sourceContext={section.title}
                  />
                  {section.children.map((child) => (
                    <BriefSection key={child.id} node={child} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function FundingSidebarTitle({ title }: { title: string }) {
  if (title === "How much funding can the project receive?") {
    return <>How much <span className="text-[#1f6f9f]">funding</span> can the project receive?</>;
  }

  if (title === "What is the project start date?") {
    return <>What is the project <span className="text-[#164d73]">start date</span>?</>;
  }

  if (title === "How to submit a complete application?") {
    return <>How to submit a complete <span className="text-[#17675f]">application</span>?</>;
  }

  return <InlineMarkdown text={title} />;
}

function BriefSection({ node }: { node: BriefNode }) {
  if (node.level === 3 || node.level === 4) {
    const Heading = node.level === 3 ? "h3" : "h4";

    return (
      <details
        id={node.id}
        className="group mb-4 scroll-mt-6 overflow-hidden rounded-2xl border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(26,48,65,0.04)]"
      >
        <summary className="brief-summary flex cursor-pointer list-none items-center gap-4 px-5 py-5 marker:content-none transition-colors hover:bg-[#f8fbfd] sm:px-6">
          <Heading
            className={
              node.level === 3
                ? "min-w-0 flex-1 text-lg font-semibold leading-[1.55] tracking-[-0.02em] text-black sm:text-xl"
                : "min-w-0 flex-1 text-base font-semibold leading-[1.5] text-black sm:text-lg"
            }
          >
            <InlineMarkdown text={node.title} />
          </Heading>
          <ChevronDown className="size-5 shrink-0 text-[#58636d] transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#e5e8eb] bg-[#fbfcfd] px-5 py-5 sm:px-6 sm:py-6">
          <QuestionContent lines={node.body} sourceContext={node.title} />
          {node.children.length > 0 && (
            <div className="mt-4">
              {node.children.map((child) => (
                <BriefSection key={child.id} node={child} />
              ))}
            </div>
          )}
        </div>
      </details>
    );
  }

  if (node.level <= 2) {
    return (
      <>
        {node.body.some((line) => line.trim()) && (
          <MarkdownBody lines={node.body} />
        )}
        {node.children.map((child) => (
          <BriefSection key={child.id} node={child} />
        ))}
      </>
    );
  }

  return (
    <section id={node.id} className="scroll-mt-6 pb-9 first:pt-0">
      <h5 className="border-b border-[#dfe3e8] pb-2 text-base font-semibold">
        <InlineMarkdown text={node.title} />
      </h5>
      <MarkdownBody lines={node.body} />
      <div>
        {node.children.map((child) => (
          <BriefSection key={child.id} node={child} />
        ))}
      </div>
    </section>
  );
}

function QuestionContent({
  lines,
  compact = false,
  sourceContext,
}: {
  lines: string[];
  compact?: boolean;
  sourceContext: string;
}) {
  const groups = groupQuestionContent(lines);

  if (groups.length === 0) return null;

  return (
    <div className={compact ? "grid items-start gap-3" : "question-card-container"}>
      <div className={compact ? "contents" : "question-card-grid"}>
        {groups.map((group, index) => (
          <QuestionSectionCard
            key={`${group.title ?? "introduction"}-${index}`}
            group={group}
            index={index}
            compact={compact}
            sourceContext={sourceContext}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionSectionCard({
  group,
  index,
  compact = false,
  sourceContext,
}: {
  group: ContentGroup;
  index: number;
  compact?: boolean;
  sourceContext: string;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const palette = getSectionCardPalette(index);
  const sourceReference = cmSourceReference(sourceContext, group.title);
  const guidingQuestionIndex = compact
    ? -1
    : group.blocks.findIndex((block) => block.type === "paragraph");
  const guidingQuestionBlock = group.blocks[guidingQuestionIndex];
  const guidingQuestion =
    guidingQuestionBlock?.type === "paragraph"
      ? guidingQuestionBlock.text
      : null;
  const answerBlocks = group.blocks.filter(
    (_, index) => index !== guidingQuestionIndex,
  );

  async function copyCard() {
    const text = [
      group.title,
      compact
        ? plainHeading(sourceContext)
        : guidingQuestion && plainCardText(guidingQuestion),
      copyableBlocks(answerBlocks),
      `(${cmSourceFilename}, ${sourceReference.split(" · ")[0]})`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  if (!group.title) {
    return (
      <section
        className={`${compact ? "" : "question-card-item "}rounded-xl border p-4 ${palette.frame}`}
      >
        <RichContentBlocks blocks={group.blocks} compact={compact} />
      </section>
    );
  }

  return (
    <details
      className={`group/section ${compact ? "" : "question-card-item "}self-start overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(26,48,65,0.04)] transition-colors ${palette.frame}`}
    >
      <summary
        className={`flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 marker:content-none transition-colors ${compact ? "" : "sm:px-5"} ${palette.hover}`}
      >
        <div className="min-w-0">
          <h5 className={`text-sm font-semibold leading-[1.45] ${palette.title}`}>
            {group.title}
          </h5>
          {guidingQuestion && (
            <p className="mt-2 text-base font-semibold leading-[1.5] text-black">
              <InlineMarkdown text={guidingQuestion} />
            </p>
          )}
        </div>
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${palette.icon}`}>
          <ChevronDown className="size-4 transition-transform duration-200 group-open/section:rotate-180" />
        </span>
      </summary>
      <div
        className={`brief-copy border-t px-4 pb-4 pt-3 ${compact ? "text-sm leading-[1.5]" : "text-base leading-[1.55] sm:px-5 sm:pb-5 sm:pt-4"} ${palette.divider}`}
      >
        {answerBlocks.length > 0 && (
          <RichContentBlocks blocks={answerBlocks} compact={compact} />
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={copyCard}
            aria-label={`Copy complete ${group.title} card`}
            title={copyStatus === "copied" ? "Copied" : "Copy card to clipboard"}
            className="grid size-8 place-items-center rounded-md border border-[#d7e1e7] bg-white/85 text-[#364651] transition-colors hover:border-[#a9c9db] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
          >
            {copyStatus === "copied" ? (
              <Check className="size-4 text-[#18734d]" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </button>
          <span role="status" className="sr-only">
            {copyStatus === "copied"
              ? "Card copied to clipboard"
              : copyStatus === "failed"
                ? "Could not copy the card"
                : ""}
          </span>
        </div>
        <SourceReference
          reference={sourceReference}
          className="mt-2 border-t border-black/10 pt-3"
        />
      </div>
    </details>
  );
}

function SourceReference({
  reference,
  className = "",
}: {
  reference: string;
  className?: string;
}) {
  return (
    <p
      className={`${className} text-xs font-medium leading-[1.4] tracking-[0.01em] text-[#6b7781]`}
    >
      Source: {cmSourceFilename} · {reference}
    </p>
  );
}

function RichContentBlocks({
  blocks,
  compact,
  trailingReference,
}: {
  blocks: RichBlock[];
  compact: boolean;
  trailingReference?: ReactNode;
}) {
  return blocks.map((block, index) => {
    if (block.type === "list") {
      return (
        <ul
          key={`list-${index}`}
          className={`${compact ? "mb-4 space-y-2 pl-4" : "mb-4 space-y-2 pl-5"} list-disc last:mb-0`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>
              <InlineMarkdown text={item} />
              {index === blocks.length - 1 && itemIndex === block.items.length - 1 && trailingReference}
            </li>
          ))}
        </ul>
      );
    }

    if (block.type === "table") {
      return (
        <div
          key={`table-${index}`}
          className="mb-4 overflow-x-auto rounded-lg border border-[#dfe3e8] bg-white last:mb-0"
        >
          <table
            className={`${compact ? "w-full table-fixed" : "w-full min-w-[calc(26.25rem*var(--tool-ui-scale))]"} border-collapse text-left text-xs leading-[1.45]`}
          >
            {index === blocks.length - 1 && trailingReference && (
              <caption className="caption-bottom px-3 py-2 text-left">{trailingReference}</caption>
            )}
            <thead className="bg-[#eef6fb] text-[#164d73]">
              <tr>
                {block.headers.map((header, headerIndex) => (
                  <th
                    key={`${header}-${headerIndex}`}
                    className="break-words border-b border-[#dfe3e8] px-3 py-2 font-semibold"
                  >
                    <InlineMarkdown text={header} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className="border-b border-[#edf0f2] last:border-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${cell}-${cellIndex}`}
                      className="break-words px-3 py-2 align-top"
                    >
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p key={`${block.text}-${index}`} className="mb-3 last:mb-0">
        <InlineMarkdown text={block.text} />
        {index === blocks.length - 1 && trailingReference}
      </p>
    );
  });
}

function MarkdownBody({ lines }: { lines: string[] }) {
  const paragraphs = splitParagraphs(lines);

  if (paragraphs.length === 0) return null;

  return (
    <div className="brief-copy pt-5 text-base leading-[1.55]">
      {paragraphs.map((paragraph, index) => {
        const strongOnly = paragraph.match(/^\*\*(.+)\*\*$/);

        if (strongOnly) {
          return (
            <p
              key={`${paragraph}-${index}`}
              className="mb-1 mt-6 font-semibold first:mt-0"
            >
              {strongOnly[1]}
            </p>
          );
        }

        return (
          <p key={`${paragraph}-${index}`} className="mb-4 last:mb-0">
            <InlineMarkdown text={paragraph} />
          </p>
        );
      })}
    </div>
  );
}

function groupQuestionContent(lines: string[]): ContentGroup[] {
  const questionStyleCardTitles = new Set([
    "How much money can be requested?",
    "Who in the consortium receives the funding?",
    "How should funding be distributed across the project budget?",
  ]);
  const groups: ContentGroup[] = [];
  let currentGroup: ContentGroup | null = null;
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const ensureGroup = () => {
    if (!currentGroup) {
      currentGroup = { title: null, blocks: [] };
      groups.push(currentGroup);
    }
    return currentGroup;
  };

  const addBlock = (block: RichBlock) => {
    ensureGroup().blocks.push(block);
  };

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      addBlock({ type: "paragraph", text: paragraphLines.join(" ") });
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      addBlock({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const strongOnly = line.match(/^\*\*(.+?)\*\*$/);

    if (
      strongOnly &&
      (!/[.!?]$/.test(strongOnly[1].trim()) ||
        questionStyleCardTitles.has(strongOnly[1].trim()))
    ) {
      flushParagraph();
      flushList();
      currentGroup = { title: strongOnly[1].trim(), blocks: [] };
      groups.push(currentGroup);
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      flushParagraph();
      flushList();

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      index -= 1;

      const rows = tableLines.map(parseTableRow);
      const headers = rows[0] ?? [];
      const bodyRows = rows.slice(1).filter((row) => !isTableDivider(row));
      if (headers.length > 0) {
        addBlock({ type: "table", headers, rows: bodyRows });
      }
      continue;
    }

    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      continue;
    }

    if (!line) {
      flushParagraph();
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return groups.filter((group) => group.blocks.length > 0);
}

function parseTableRow(line: string) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableDivider(row: string[]) {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {text
        .split(
          /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g,
        )
        .filter(Boolean)
        .map((part, index) => {
          const boldItalic = part.match(/^\*\*\*(.+)\*\*\*$/);
          if (boldItalic) {
            return (
              <strong key={`${part}-${index}`}>
                <em>{boldItalic[1]}</em>
              </strong>
            );
          }

          const bold = part.match(/^\*\*(.+)\*\*$/);
          if (bold) return <strong key={`${part}-${index}`}>{bold[1]}</strong>;

          const italic = part.match(/^\*(.+)\*$/);
          if (italic) {
            return (
              <span key={`${part}-${index}`} className="text-[#1f6f9f]">
                {italic[1]}
              </span>
            );
          }

          const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (link) {
            return (
              <a
                key={`${part}-${index}`}
                href={link[2]}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1f6f9f] underline decoration-[#9bccea] underline-offset-3"
              >
                {link[1]}
              </a>
            );
          }

          return part;
        })}
    </>
  );
}

function splitParagraphs(lines: string[]) {
  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) paragraphs.push(current.join(" "));
    current = [];
  };

  lines.forEach((line) => {
    if (line.trim()) current.push(line.trim());
    else flush();
  });
  flush();

  return paragraphs;
}

function parseBrief(markdown: string) {
  const root: BriefNode = {
    level: 0,
    title: "",
    id: "document",
    body: [],
    children: [],
  };
  const stack = [root];
  const usedIds = new Map<string, number>();

  markdown.split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);

    if (!heading) {
      stack[stack.length - 1].body.push(line);
      return;
    }

    const level = heading[1].length;
    const title = heading[2];
    const baseId =
      title
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "section";
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const node: BriefNode = {
      level,
      title,
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      body: [],
      children: [],
    };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });

  return root.children;
}
