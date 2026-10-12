"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string };
type TabsProps = { tabs: Tab[]; activeTab: string; onTabChange: (id: string) => void; className?: string; label?: string };

export function VercelTabs({ tabs, activeTab, onTabChange, className, label = "Sections" }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeTab));

  useEffect(() => {
    const update = () => {
      const active = refs.current[activeIndex];
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    update();
    const observer = new ResizeObserver(update);
    refs.current.forEach(node => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [activeIndex, tabs]);

  function move(current: number, direction: number) {
    const next = (current + direction + tabs.length) % tabs.length;
    onTabChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return <div role="tablist" aria-label={label} className={cn("relative flex max-w-full items-center gap-6 overflow-x-auto border-b border-border", className)}>
    <span aria-hidden="true" className="pointer-events-none absolute bottom-[-1px] h-0.5 rounded-full bg-primary transition-[left,width] duration-[240ms] ease-mend motion-reduce:transition-none" style={{ left: indicator.left, width: indicator.width }} />
    {tabs.map((tab, index) => <button key={tab.id} ref={node => { refs.current[index] = node; }} type="button" role="tab" id={`rcc-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`rcc-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => onTabChange(tab.id)} onKeyDown={event => { if (event.key === "ArrowRight") { event.preventDefault(); move(index, 1); } if (event.key === "ArrowLeft") { event.preventDefault(); move(index, -1); } }} className="relative z-10 flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded px-0 text-sm font-medium tracking-[-.006em] text-text-secondary outline-none transition-colors hover:text-text-primary aria-selected:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{tab.label}</button>)}
  </div>;
}
