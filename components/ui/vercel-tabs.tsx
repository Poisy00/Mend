"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string };
type TabsProps = { tabs: Tab[]; activeTab: string; onTabChange: (id: string) => void; className?: string; label?: string };

export function VercelTabs({ tabs, activeTab, onTabChange, className, label = "Sections" }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [hoverIndicator, setHoverIndicator] = useState({ left: 0, width: 0 });
  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeTab));

  useEffect(() => {
    const update = () => {
      const active = refs.current[activeIndex];
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
      const hovered = hover === null ? null : refs.current[hover];
      if (hovered) setHoverIndicator({ left: hovered.offsetLeft, width: hovered.offsetWidth });
    };
    update();
    const observer = new ResizeObserver(update);
    refs.current.forEach(node => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [activeIndex, hover, tabs]);

  function move(current: number, direction: number) {
    const next = (current + direction + tabs.length) % tabs.length;
    onTabChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return <div role="tablist" aria-label={label} className={cn("relative flex max-w-full items-center gap-1 overflow-x-auto border-b border-border pb-1", className)} onMouseLeave={() => setHover(null)}>
    <span aria-hidden="true" className="pointer-events-none absolute top-1 h-9 rounded-lg bg-accent/80 opacity-0 transition-[left,width,opacity] duration-150 ease-out motion-reduce:transition-none" style={{ left: hoverIndicator.left, width: hoverIndicator.width, opacity: hover === null ? 0 : 1 }} />
    <span aria-hidden="true" className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary transition-[left,width] duration-200 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none" style={{ left: indicator.left, width: indicator.width }} />
    {tabs.map((tab, index) => <button key={tab.id} ref={node => { refs.current[index] = node; }} type="button" role="tab" id={`rcc-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`rcc-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onMouseEnter={() => setHover(index)} onClick={() => onTabChange(tab.id)} onKeyDown={event => { if (event.key === "ArrowRight") { event.preventDefault(); move(index, 1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(index, -1); } }} className={cn("relative z-10 flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:px-4", activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>{tab.label}</button>)}
  </div>;
}
