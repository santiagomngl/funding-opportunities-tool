import { useEffect, useState } from "react";

/** The bottom edge of everything that sticks to the top of the window. */
export function stickyBottom() {
  const bars = document.querySelectorAll<HTMLElement>("[data-sticky-bar]");
  let bottom = 0;
  for (const bar of bars) bottom = Math.max(bottom, bar.getBoundingClientRect().bottom);
  return bottom;
}

/** Scrolls the window so the element sits just below the sticky bars, and moves focus to it. */
export function scrollToAnchor(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: window.scrollY + target.getBoundingClientRect().top - stickyBottom() - 16,
    behavior: reduced ? "instant" : "smooth",
  });
  target.focus({ preventScroll: true });
}

/** The id of the anchor being read: the lowest one that has reached the top of the reading area. */
export function useActiveAnchor(selector: string, key: unknown) {
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = stickyBottom() + 40;
      let first = "";
      let current = "";
      let currentTop = -Infinity;
      for (const target of document.querySelectorAll<HTMLElement>(selector)) {
        if (!first) first = target.id;
        const top = target.getBoundingClientRect().top;
        // Side by side (two columns), the first one in the page wins.
        if (top <= line && top > currentTop) {
          current = target.id;
          currentTop = top;
        }
      }
      setActiveId(current || first);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [selector, key]);
  return [activeId, setActiveId] as const;
}
