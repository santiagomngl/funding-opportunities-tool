import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ChevronRight } from "lucide-react";

import { PlainText } from "@/components/plain-text.tsx";
import { sourceLines, type VisibleSection } from "@/lib/report.ts";

type Reference = { number: number; text: string; citations: string[] };

/** One numbered reference per distinct sources text, in order of first use. */
function collectReferences(sections: VisibleSection[]) {
  const references: Reference[] = [];
  const bySources = new Map<string, number>();
  const byCard = new Map<string, number>();
  for (const section of sections) {
    for (const card of section.cards) {
      if (!card.sources) continue;
      let number = bySources.get(card.sources);
      if (number === undefined) {
        number = references.length + 1;
        bySources.set(card.sources, number);
        references.push({ number, text: card.sources, citations: [] });
      }
      byCard.set(card.id, number);
      references[number - 1].citations.push(`${card.id}-citation`);
    }
  }
  return { references, byCard };
}

/** The same report as one continuous text, with a contents list and references. */
export function ArticleView({ sections }: { sections: VisibleSection[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const { references, byCard } = useMemo(() => collectReferences(sections), [sections]);

  // Highlight the section being read in the contents list.
  useEffect(() => {
    const root = viewport.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = root.getBoundingClientRect().top + 48;
      let current = "";
      for (const target of root.querySelectorAll<HTMLElement>("[data-article-anchor]")) {
        if (current && target.getBoundingClientRect().top > readingLine) break;
        current = target.id;
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    root.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      root.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections]);

  function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const root = viewport.current;
    const target = document.getElementById(id);
    if (!root || !target || !root.contains(target)) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (root.scrollHeight > root.clientHeight) {
      root.scrollTo({
        top: root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - 24,
        behavior,
      });
    } else {
      // Small screens: the whole detail view scrolls, not this pane.
      target.scrollIntoView({ behavior, block: "start" });
    }
    target.focus({ preventScroll: true });
    if (target.hasAttribute("data-article-anchor")) setActiveId(id);
  }

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const linkClassName = (current: boolean) =>
    `hover:underline ${current ? "font-semibold text-black" : "text-[#1f6f9f]"}`;

  return (
    <div ref={viewport} className="bg-white lg:min-h-0 lg:flex-1 lg:overflow-y-auto" aria-label="Funding opportunity article view">
      <div className="mx-auto grid max-w-[var(--tool-detail-width)] items-start gap-8 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[calc(17rem*var(--tool-ui-scale))_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Article contents"
          className="min-w-0 rounded-lg border border-[#e4e8eb] bg-[#fbfcfd] p-4 text-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:border-r lg:bg-white lg:py-0 lg:pl-0 lg:pr-5"
        >
          <h2 className="mb-3 font-bold text-black">Contents</h2>
          <ul className="space-y-2">
            {sections.map((section) => {
              const open = expanded.has(section.id);
              const current = activeId === section.id || activeId.startsWith(`${section.id}-`);
              return (
                <li key={section.id}>
                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => toggle(section.id)}
                      aria-label={`${open ? "Collapse" : "Expand"} ${section.title} index`}
                      aria-expanded={open}
                      aria-controls={`index-${section.id}`}
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded text-[#58636d] hover:bg-[#edf5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
                    >
                      <ChevronRight aria-hidden="true" className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                    </button>
                    <a
                      href={`#${section.id}`}
                      onClick={(event) => jump(event, section.id)}
                      aria-current={activeId === section.id ? "location" : undefined}
                      className={`min-w-0 py-1 leading-[1.5] ${linkClassName(current)}`}
                    >
                      {section.title}
                    </a>
                  </div>
                  <ul id={`index-${section.id}`} hidden={!open} className="ml-7 space-y-1 border-l border-[#e4e8eb] pl-3">
                    {section.cards.map((card) => (
                      <li key={card.id}>
                        <a
                          href={`#${card.id}`}
                          onClick={(event) => jump(event, card.id)}
                          aria-current={activeId === card.id ? "location" : undefined}
                          className={`block py-1 leading-[1.45] ${linkClassName(activeId === card.id)}`}
                        >
                          {card.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {references.length > 0 && (
              <li className="pl-7">
                <a
                  href="#article-references"
                  onClick={(event) => jump(event, "article-references")}
                  aria-current={activeId === "article-references" ? "location" : undefined}
                  className={`block py-1 ${linkClassName(activeId === "article-references")}`}
                >
                  References
                </a>
              </li>
            )}
          </ul>
        </nav>

        <article className="opportunity-article-copy min-w-0 max-w-5xl pb-16">
          {sections.map((section) => (
            <section key={section.id} id={section.id} tabIndex={-1} data-article-anchor className="article-section scroll-mt-6 pb-10 outline-none">
              <h2 className="border-b border-[#dfe3e8] pb-2 text-2xl font-bold leading-[1.4] text-black">
                {section.title}
              </h2>
              {section.question && (
                <p className="article-question mb-5 mt-3 text-base font-normal italic leading-[1.6] text-[#27313a]">
                  {section.question}
                </p>
              )}
              {section.cards.map((card) => {
                const number = byCard.get(card.id);
                const citation = number === undefined ? undefined : (
                  <sup id={`${card.id}-citation`} tabIndex={-1} className="ml-0.5 text-[0.75em] font-normal not-italic leading-none">
                    <a
                      href={`#article-reference-${number}`}
                      onClick={(event) => jump(event, `article-reference-${number}`)}
                      aria-label={`Reference ${number}`}
                      className="text-[#1f6f9f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bccea]"
                    >
                      [{number}]
                    </a>
                  </sup>
                );
                return (
                  <section key={card.id} id={card.id} tabIndex={-1} data-article-anchor className="article-subsection mt-7 scroll-mt-6 outline-none">
                    <h3 className="mb-2 text-xl font-bold leading-[1.5] text-black">{card.title}</h3>
                    {card.question && (
                      <p className="article-question mb-3 text-base font-normal italic leading-[1.6] text-[#27313a]">
                        {card.question}
                      </p>
                    )}
                    <div className="article-body text-base leading-[1.75] text-[#27313a]">
                      <PlainText text={card.answer} trailing={citation} />
                    </div>
                  </section>
                );
              })}
            </section>
          ))}
          {references.length > 0 && (
            <section id="article-references" data-article-anchor tabIndex={-1} className="scroll-mt-6 border-t border-[#dfe3e8] pt-7 outline-none">
              <h2 className="text-2xl font-bold text-black">References</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-6 text-sm leading-[1.6]">
                {references.map((reference) => (
                  <li key={reference.number} id={`article-reference-${reference.number}`} tabIndex={-1} className="scroll-mt-6 pl-1 outline-none target:bg-[#f0f8fb]">
                    {reference.citations.map((citation, index) => (
                      <a
                        key={citation}
                        href={`#${citation}`}
                        onClick={(event) => jump(event, citation)}
                        aria-label={`Return to citation ${reference.number}${reference.citations.length > 1 ? `, occurrence ${index + 1}` : ""}`}
                        className="mr-2 text-[#1f6f9f] hover:underline"
                      >
                        ↑{reference.citations.length > 1 ? index + 1 : ""}
                      </a>
                    ))}
                    {sourceLines(reference.text).map((line, index) => (
                      <span key={index} className={index === 0 ? "" : "block"}>
                        {line}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
