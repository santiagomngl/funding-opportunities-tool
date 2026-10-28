import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  configFile: false,
  appType: "custom",
  root,
  plugins: [react()],
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});
after(() => vite.close());

const { createArticleSections, collectArticleReferences, currentArticleTarget } =
  await vite.ssrLoadModule("/lib/opportunity-article.ts");
const { OpportunityArticle } = await vite.ssrLoadModule("/components/opportunity-article.tsx");

const body = [
  { type: "paragraph", text: "What must the project *develop*?" },
  { type: "paragraph", text: "**The complete answer.** Its qualification stays intact." },
  { type: "list", items: ["First requirement", "Second requirement"] },
  { type: "table", headers: ["Partner", "Rate"], rows: [["Research organisation", "100%"]] },
];
const groups = {
  main: [{ title: "Central object", blocks: body }],
  funding: [{ title: "Who receives funding?", blocks: [{ type: "paragraph", text: "**Research organisations receive funding.**" }] }],
};
const node = (id, title) => ({ id, title, body: [id], children: [] });
const sections = createArticleSections(
  [node("main", "Which *problem or need* must the project address?")],
  [node("funding", "How much funding can the project receive?")],
  ([id]) => groups[id],
  () => "pp. 40–43 · Scope",
);

test("preserves main questions, complete answers, lists and tables in article order", () => {
  assert.equal(sections[0].title, "Problem or Need");
  assert.equal(sections[0].question, "Which problem or need must the project address?");
  const group = sections[0].groups[0];
  assert.equal(group.title, "Central object");
  assert.equal(group.question, "What must the project develop?");
  assert.deepEqual(group.blocks, body.slice(1));
  assert.deepEqual(groups.main[0].blocks, body);
  assert.equal(sections[1].title, "Funding");
});

test("keeps funding questions italic-ready and retains their first answer paragraph", () => {
  const group = sections[1].groups[0];
  assert.equal(group.title, null);
  assert.equal(group.question, "Who receives funding?");
  assert.deepEqual(group.blocks, groups.funding[0].blocks);
});

test("deduplicates source references and retains every citation backlink", () => {
  const { references, byGroup } = collectArticleReferences(sections);
  assert.equal(references.length, 1);
  assert.equal(references[0].text, "pp. 40–43 · Scope");
  assert.equal(references[0].citations.length, 2);
  assert.equal(byGroup.get(sections[0].groups[0].id), 1);
  assert.equal(byGroup.get(sections[1].groups[0].id), 1);
});

test("reading position follows main sections, subsections and references", () => {
  const targets = [
    { id: "problem", top: -200 },
    { id: "central-object", top: 20 },
    { id: "funding", top: 600 },
    { id: "references", top: 1400 },
  ];
  assert.equal(currentArticleTarget(targets, 48), "central-object");
  assert.equal(currentArticleTarget(targets, 650), "funding");
  assert.equal(currentArticleTarget(targets, 1500), "references");
  assert.equal(currentArticleTarget([], 48), "");
});

test("renders a continuous article with closed index branches and working reference destinations", () => {
  const html = renderToStaticMarkup(React.createElement(OpportunityArticle, {
    sections,
    sourceFilename: "call-text.pdf",
    active: false,
    renderBlocks: (blocks, reference) => React.createElement("div", null,
      blocks.map((block, i) => React.createElement("p", { key: i }, JSON.stringify(block))),
      reference,
    ),
  }));

  assert.match(html, /<em>Which problem or need must the project address\?<\/em>/);
  assert.match(html, /<em>What must the project develop\?<\/em>/);
  assert.match(html, /<em>Who receives funding\?<\/em>/);
  assert.doesNotMatch(html, /<strong>[^<]*\?<\/strong>/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /id="index-[^"]+" hidden=""/);
  assert.match(html, /id="article-reference-1"/);
  assert.match(html, /href="#article-reference-1"/);
  assert.match(html, /call-text\.pdf/);
  assert.match(html, /Second requirement/);
  assert.match(html, /100%/);
  assert.doesNotMatch(html, /<details/);

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(target), `Missing anchor destination: ${target}`);
  }
});
