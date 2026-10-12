"use client";

import { MendLink } from "@/components/mend-link";
import { StatusPill, TimeRing } from "@/components/ui/status";
import { displayName } from "@/lib/display/format";
import type { Tone } from "@/lib/follow-ups/display";
import { cn } from "@/lib/utils";

type WorkRowProps = {
  title: string; subtitle: string; eyebrow?: string; meta: string; metaLate?: boolean;
  tone: Tone; statusLabel: string; statusIcon?: "open" | "scheduled" | "handoff" | "closed"; left: number;
  selected?: boolean; mended?: boolean; onClick?: () => void; href?: string;
};

export function WorkListHeader({ subject = "Customer", detail = "Status / next" }: { subject?: string; detail?: string }) {
  return <div aria-hidden="true" className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 border-b border-border bg-muted/40 py-2.5 pl-3.5 pr-4 text-xs font-medium text-text-secondary"><span /><span>{subject}</span><span className="text-right">{detail}</span></div>;
}

const rowClass = "group relative grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border py-4 pl-3.5 pr-4 text-left outline-none transition-colors duration-150 hover:bg-surface-hover focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-0.5 before:rounded-full before:bg-primary before:origin-center before:scale-y-0 before:transition-transform before:duration-[240ms] before:ease-mend";

export function WorkRow({ title, subtitle, eyebrow, meta, metaLate, tone, statusLabel, statusIcon, left, selected, mended, onClick, href }: WorkRowProps) {
  const name = displayName(title);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "?";
  const className = cn(rowClass, selected && "bg-accent hover:bg-accent before:scale-y-100");
  const children = <>
    <TimeRing tone={tone} left={left} initials={initials} selected={selected} />
    <span className="min-w-0">
      {eyebrow && <span className="type-id block truncate text-text-secondary">{eyebrow}</span>}
      <strong className={cn("mt-0.5 inline-block max-w-full truncate text-[15px] font-semibold leading-[1.3] tracking-[-.01em] text-text-primary", mended && "mend-stitch")}>{name}</strong>
      <span className="mt-0.5 block truncate text-[13px] leading-[1.4] text-text-secondary">{subtitle}</span>
    </span>
    <span className="grid justify-items-end gap-1.5">
      <StatusPill tone={tone} icon={statusIcon}>{statusLabel}</StatusPill>
      <span className={cn("text-xs tabular-nums", metaLate ? "font-medium text-status-overdue" : "text-text-secondary")}>{meta}</span>
    </span>
  </>;
  if (href) return <MendLink href={href} aria-current={selected ? "true" : undefined} className={className}>{children}</MendLink>;
  return <button type="button" onClick={onClick} aria-current={selected ? "true" : undefined} className={className}>{children}</button>;
}
