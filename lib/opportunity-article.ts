export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

type BriefNode = {
  title: string;
  id: string;
  body: string[];
  children: BriefNode[];
};

type ContentGroup = { title: string | null; blocks: ArticleBlock[] };

export type ArticleGroup = {
  id: string;
  label: string;
  title: string | null;
  question: string | null;
  blocks: ArticleBlock[];
  source: string | null;
};

export type ArticleSection = {
  id: string;
  title: string;
  question: string | null;
  groups: ArticleGroup[];
  children: ArticleSection[];
};

const sectionTitles: Record<string, string> = {
  "Which problem or need must the project address?": "Problem or Need",
  "How must collaboration be organised?": "Collaboration",
  "What is TenneT’s position within the consortium?": "TenneT’s Position",
  "What type of innovation must the project develop?": "Type of Innovation",
  "Which activities or work structure must the project cover?":
    "Activities or Work Structure",
  "In which environment must the project take place?": "Environment",
  "How must the project scale, replicate or achieve uptake?":
    "Scale, Replication or Uptake",
  "How must project deliver change?": "Change",
  "How much funding can the project receive?": "Funding",
  "What is the project start date?": "Project Start Date",
  "How to submit a complete application?": "Application",
};

function unmarked(text: string) {
  return text.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

export function createArticleSections(
  mainNodes: BriefNode[],
  fundingNodes: BriefNode[],
  groupContent: (lines: string[]) => ContentGroup[],
  sourceFor: (question: string, title?: string | null) => string,
): ArticleSection[] {
  const convert = (
    node: BriefNode,
    path: string,
    compact: boolean,
  ): ArticleSection => {
    const question = unmarked(node.title);
    const id = `article-${path}-${node.id}`;

    return {
      id,
      title: sectionTitles[question] ?? question,
      question: question.endsWith("?") ? question : null,
      groups: groupContent(node.body).map((group, index) => {
        const questionTitle = Boolean(group.title?.endsWith("?"));
        const guidingIndex = !compact && !questionTitle
          ? group.blocks.findIndex((block) => block.type === "paragraph")
          : -1;
        const guidingBlock = group.blocks[guidingIndex];
        const guidingQuestion = questionTitle
          ? unmarked(group.title!)
          : guidingBlock?.type === "paragraph"
            ? unmarked(guidingBlock.text)
            : null;

        return {
          id: `${id}-subsection-${index + 1}`,
          label: unmarked(group.title ?? "Introduction"),
          title: questionTitle ? null : group.title,
          question: guidingQuestion,
          blocks: group.blocks.filter((_, blockIndex) => blockIndex !== guidingIndex),
          source: group.title ? sourceFor(node.title, group.title) : null,
        };
      }),
      children: node.children.map((child, index) =>
        convert(child, `${path}-${index + 1}`, false),
      ),
    };
  };

  return [
    ...mainNodes.map((node, index) => convert(node, `main-${index + 1}`, false)),
    ...fundingNodes.map((node, index) => convert(node, `funding-${index + 1}`, true)),
  ];
}

export function collectArticleReferences(sections: ArticleSection[]) {
  const references: { number: number; text: string; citations: string[] }[] = [];
  const bySource = new Map<string, number>();
  const byGroup = new Map<string, number>();

  const visit = (section: ArticleSection) => {
    section.groups.forEach((group) => {
      if (!group.source) return;
      let number = bySource.get(group.source);
      if (number === undefined) {
        number = references.length + 1;
        bySource.set(group.source, number);
        references.push({ number, text: group.source, citations: [] });
      }
      byGroup.set(group.id, number);
      references[number - 1].citations.push(`${group.id}-citation`);
    });
    section.children.forEach(visit);
  };
  sections.forEach(visit);

  return { references, byGroup };
}

export function currentArticleTarget(
  targets: { id: string; top: number }[],
  readingLine: number,
) {
  let current = targets[0]?.id ?? "";
  for (const target of targets) {
    if (target.top > readingLine) break;
    current = target.id;
  }
  return current;
}
