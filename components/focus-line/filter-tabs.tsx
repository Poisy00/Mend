"use client";

import { useRef, type HTMLAttributes, type KeyboardEvent } from "react";
import { SlidingIndicator, useSlidingIndicator } from "@/components/ui/sliding-indicator";
import { cn } from "@/lib/utils";

export type FilterTone = "neutral" | "overdue" | "due" | "accent" | "done";
export type FilterTab<K extends string> = { key: K; label: string; count?: number; tone?: FilterTone };

const chipTone: Record<FilterTone, string> = {
  neutral: "bg-surface-hover text-text-secondary",
  overdue: "bg-status-overdue-tint text-status-overdue",
  due: "bg-status-due-tint text-status-due",
  accent: "bg-accent text-primary",
  done: "bg-status-done-tint text-status-done",
};

/**
 * The segmented strip shared by every filter and tab control.
 * `toggle` is a group of pressed buttons (filters); `tabs` is a real tablist with arrow-key navigation.
 */
export function FilterTabs<K extends string>({ tabs, value, onChange, label, variant = "toggle", tabProps, className }: {
  tabs: FilterTab<K>[]; value: K; onChange: (key: K) => void; label: string;
  variant?: "toggle" | "tabs"; tabProps?: (key: K) => HTMLAttributes<HTMLButtonElement>; className?: string;
}) {
  const asTabs = variant === "tabs";
  const strip = useRef<HTMLDivElement>(null);
  useSlidingIndicator(strip, value);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!asTabs) return;
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(tabs.findIndex(tab => tab.key === value) + step + tabs.length) % tabs.length];
    onChange(next.key);
    window.requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus());
  }
  return <div ref={strip} data-indicator-host="" role={asTabs ? "tablist" : "group"} aria-label={label} onKeyDown={onKeyDown} className={cn("relative flex w-max max-w-full gap-1 overflow-x-auto rounded-[12px] bg-desk p-1", className)}>
    <SlidingIndicator className="rounded-[9px] bg-sheet shadow-chip" />
    {tabs.map(({ key, label: text, count, tone = "neutral" }) => {
      const active = value === key;
      return <button key={key} type="button" data-indicator-key={key} data-indicator-active={active || undefined} {...(asTabs ? { role: "tab", "aria-selected": active, tabIndex: active ? 0 : -1 } : { "aria-pressed": active })} {...tabProps?.(key)} onClick={() => onChange(key)}
        className={cn("t-label relative z-10 inline-flex h-8 shrink-0 items-center gap-2 rounded-[9px] px-3 whitespace-nowrap outline-none transition-colors duration-150 [--ind-bg:var(--sheet)] [--ind-shadow:var(--chip-shadow)] focus-visible:outline-2 focus-visible:outline-ring", active ? "text-foreground" : "text-text-secondary")}>
        {text}{count !== undefined && <span className={cn("t-caption num inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 !font-semibold", chipTone[tone])}>{count}</span>}
      </button>;
    })}
  </div>;
}
