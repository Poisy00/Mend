"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";

type Geometry = { x: number; y: number; w: number; h: number };
const keyed = (container: HTMLElement, key: string) => container.querySelector<HTMLElement>(`[data-indicator-key="${CSS.escape(key)}"]`);

/** Position of the item inside `container`, from layout offsets so presses and scale transforms never skew it. */
function measure(container: HTMLElement, key: string): Geometry | null {
  const item = keyed(container, key);
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
 * and mark each item with `data-indicator-key` (items may be nested, but every offset parent up to the container must be laid out). The first placement,
 * resizes and content changes are instant; only a change of `activeKey` slides.
 */
export function useSlidingIndicator(containerRef: RefObject<HTMLElement | null>, activeKey: string | null) {
  const state = useRef<{ key: string | null; geometry: Geometry | null; shown: boolean; placed: boolean; container: HTMLElement | null }>({ key: null, geometry: null, shown: false, placed: false, container: null });
  const watcher = useRef<{ observer: ResizeObserver | null; target: HTMLElement | null }>({ observer: null, target: null });
  const sync = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    sync.current = () => {
      const container = containerRef.current;
      const indicator = container?.querySelector<HTMLElement>(":scope > [data-sliding-indicator]");
      if (!container || !indicator) return;
      // A replaced container (a keyed list remounting) starts over, so its fresh indicator is placed instead of assumed.
      if (state.current.container !== container) state.current = { key: null, geometry: null, shown: false, placed: false, container };
      if (watcher.current.target !== container && typeof ResizeObserver !== "undefined") {
        watcher.current.observer?.disconnect();
        watcher.current.observer = new ResizeObserver(() => sync.current());
        watcher.current.observer.observe(container);
        watcher.current.target = container;
      }
      const prev = state.current;
      const geometry = activeKey === null ? null : measure(container, activeKey);
      const keyChanged = prev.key !== activeKey;
      if (!geometry) {
        if (prev.shown) { indicator.style.opacity = "0"; prev.shown = false; }
        state.current = { key: activeKey, geometry: null, shown: false, placed: prev.placed, container };
        return;
      }
      if (!keyChanged && prev.shown && same(prev.geometry, geometry)) return;
      // Slide only between rows that both still exist; a row that left the list (a resolve collapse) is replaced without sliding.
      const slide = keyChanged && prev.shown && prev.key !== null && !!keyed(container, prev.key);
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
      state.current = { key: activeKey, geometry, shown: true, placed: true, container };
    };
    sync.current();
  });

  useEffect(() => {
    const run = () => sync.current();
    void document.fonts?.ready.then(run);
    const hold = watcher.current;
    return () => { hold.observer?.disconnect(); hold.observer = null; hold.target = null; };
  }, []);
}

/** The moving highlight. Pass the control's active look (background, shadow, radius) as `className`. */
export function SlidingIndicator({ className, as = "span" }: { className?: string; as?: "span" | "li" }) {
  const Tag = as;
  return <Tag aria-hidden="true" role={as === "li" ? "presentation" : undefined} data-sliding-indicator="" className={cn("mend-indicator", className)} />;
}
