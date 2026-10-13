"use client";

import { useRef } from "react";
import { SlidingIndicator, useSlidingIndicator } from "@/components/ui/sliding-indicator";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  const strip = useRef<HTMLDivElement>(null);
  useSlidingIndicator(strip, value);
  return <div ref={strip} role="group" aria-label={label} className="relative inline-flex flex-wrap gap-0.5 rounded-[10px] bg-muted p-[3px]">
    <SlidingIndicator className="rounded-md bg-surface shadow-[0_1px_2px_rgba(27,27,24,.08),0_0_0_1px_var(--border)]" />
    {options.map(option => <button key={option.value} type="button" data-indicator-key={option.value} data-indicator-active={value === option.value || undefined} aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={cn("relative z-10 h-7 rounded-md px-3 text-[13px] font-medium text-text-secondary transition-[color,transform] duration-150 [--ind-bg:var(--surface)] [--ind-shadow:0_1px_2px_rgba(27,27,24,.08),0_0_0_1px_var(--border)] active:scale-[.97]", value === option.value ? "text-text-primary" : "hover:text-text-primary")}>{option.label}</button>)}
  </div>;
}
