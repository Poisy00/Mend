"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";

type Geometry = { x: number; y: number; w: number; h: number };

/** Position of the item inside `container`, from layout offsets so presses and scale transforms never skew it. */
function measure(container: HTMLElement, key: string): Geometry | null {
  const item = container.querySelector<HTMLElement>(`:scope > [data-indicator-key="${CSS.escape(key)}"]`);
  if (!item) return null;
  let x = 0, y = 0;
  let node: HTMLElement | null = item;
  while (node && node !== container) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
  if (node !== container || !item.offsetWidth || !item.offsetHeight) return null;
  return { x, y, w: item.offsetWidth, h: item.offsetHeight };
}

const same = (a: Geometry | null, b: Geometry | null) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * Keeps one indicator element behind the active item of a single-select control.
 * The container must be `position: relative`, hold `<SlidingIndicator />` as its first child,
 * and mark each item with `data-indicator-key` (children of the container). The first placement,
 * resizes and content changes are instant; only a change of `activeKey` slides.
 */
export function useSlidingIndicator(containerRef: RefObject<HTMLElement | null>, activeKey: string | null) {
  const state = useRef<{ key: string | null; geometry: Geometry | null; shown: boolean; placed: boolean }>({ key: null, geometry: null, shown: false, placed: false });
  const sync = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    sync.current = () => {
      const container = containerRef.current;
      const indicator = container?.querySelector<HTMLElement>(":scope > [data-sliding-indicator]");
      if (!container || !indicator) return;
      const prev = state.current;
      const geometry = activeKey === null ? null : measure(container, activeKey);
      const keyChanged = prev.key !== activeKey;
      if (!geometry) {
        if (prev.shown) { indicator.style.opacity = "0"; prev.shown = false; }
        state.current = { key: activeKey, geometry: null, shown: false, placed: prev.placed };
        return;
      }
      if (!keyChanged && prev.shown && same(prev.geometry, geometry)) return;
      const slide = keyChanged && prev.shown;
      if (slide) {
        indicator.style.width = `${geometry.w}px`;
        indicator.style.height = `${geometry.h}px`;
        indicator.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
      } else {
        // Place without animating: first render, resize, content change, or reappearing after a fade-out.
        const fade = !prev.shown && prev.placed;
        indicator.style.transition = "none";
        indicator.style.width = `${geometry.w}px`;
        indicator.style.height = `${geometry.h}px`;
        indicator.style.transform = `translate(${geometry.x}px, ${geometry.y}px)`;
        if (!fade) indicator.style.opacity = "1";
        void indicator.offsetWidth;
        indicator.style.transition = "";
        if (fade) indicator.style.opacity = "1";
      }
      container.setAttribute("data-indicator-ready", "");
      state.current = { key: activeKey, geometry, shown: true, placed: true };
    };
    sync.current();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const run = () => sync.current();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(run);
    observer?.observe(container);
    void document.fonts?.ready.then(run);
    return () => observer?.disconnect();
  }, [containerRef]);
}

/** The moving highlight. Pass the control's active look (background, shadow, radius) as `className`. */
export function SlidingIndicator({ className }: { className?: string }) {
  return <span aria-hidden="true" data-sliding-indicator="" className={cn("mend-indicator", className)} />;
}
