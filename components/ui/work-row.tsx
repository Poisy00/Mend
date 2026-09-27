"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkRowProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  meta: string;
  status: string;
  tone?: "default" | "urgent" | "complete";
  selected?: boolean;
  onClick: () => void;
};

export function WorkListHeader({ subject = "Customer", detail = "Status / next" }: { subject?: string; detail?: string }) {
  return <div aria-hidden="true" className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-border bg-muted/25 px-2 py-2.5 text-[11px] font-medium text-muted-foreground sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(6.5rem,auto)_1rem] sm:gap-x-4 sm:px-3"><span /><span>{subject}</span><span className="text-right">{detail}</span><span className="hidden sm:block" /></div>;
}

export function WorkRow({ title, subtitle, eyebrow, meta, status, tone = "default", selected, onClick }: WorkRowProps) {
  const initials = title.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "?";
  return <button type="button" onClick={onClick} aria-current={selected ? "true" : undefined} className={cn("group relative grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border/70 px-2 py-4 text-left outline-none transition-[background-color,box-shadow] duration-150 hover:bg-accent/35 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/30 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(6.5rem,auto)_1rem] sm:gap-x-4 sm:px-3", selected && "bg-accent/50 shadow-[inset_3px_0_0_var(--primary)]")}>
    <span className={cn("relative grid size-10 place-items-center rounded-full border border-border bg-background text-xs font-semibold tracking-tight text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:text-primary", selected && "border-primary/20 bg-primary/10 text-primary")}>{initials}<span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background", tone === "urgent" ? "bg-destructive" : tone === "complete" ? "bg-muted-foreground/50" : "bg-primary")} /></span>
    <span className="min-w-0">
      {eyebrow && <span className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-[.11em] text-muted-foreground">{eyebrow}</span>}
      <strong className="block truncate text-[14px] font-semibold tracking-[-.015em] text-foreground">{title}</strong>
      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{subtitle}</span>
    </span>
    <span className="min-w-0 text-right">
      <span className={cn("inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-1 text-[11px] font-medium", tone === "urgent" ? "bg-destructive/10 text-destructive" : tone === "complete" ? "bg-muted text-muted-foreground" : "bg-primary/8 text-primary")}><span className={cn("size-1.5 shrink-0 rounded-full bg-current", tone === "urgent" && "animate-pulse")} />{status}</span>
      <span className="mt-1.5 hidden truncate text-[11px] text-muted-foreground sm:block">{meta}</span>
    </span>
    <ArrowUpRight aria-hidden="true" className="hidden size-4 text-muted-foreground/45 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary sm:block" />
    <span className="col-start-2 mt-1 truncate text-[11px] text-muted-foreground sm:hidden">{meta}</span>
  </button>;
}
