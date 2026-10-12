"use client";

import type { ReactNode } from "react";
import { MendLink } from "@/components/mend-link";
import { StatusPill, TimeRing } from "@/components/ui/status";
import { displayName } from "@/lib/display/format";
import type { Tone } from "@/lib/follow-ups/display";
import { cn } from "@/lib/utils";

type WorkRowProps = {
  title: string; subtitle: string; id?: string; meta: string; metaLate?: boolean;
  tone: Tone; statusLabel: string; statusIcon?: "open" | "scheduled" | "handoff" | "closed"; left: number;
  selected?: boolean; mended?: boolean; leaving?: boolean; onMended?: () => void;
  onClick?: () => void; href?: string; actions?: ReactNode; rowId?: string;
};

export function GroupLabel({ children, count, className, first }: { children: ReactNode; count?: number; className?: string; first?: boolean }) {
  return <h3 className={cn("t-eyebrow flex h-8 items-end pb-1.5", first ? "mt-3" : "mt-5", className)}>{children}{count !== undefined && <span className="t-id ml-2 !text-[11px] text-text-muted">{count}</span>}</h3>;
}

const rowClass = "group/row relative grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[10px] px-3 py-3 min-h-16 text-left outline-none transition-colors duration-[var(--dur-quick)] hover-fine:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-0.5 before:rounded-full before:bg-primary before:origin-center before:scale-y-0 before:transition-transform before:duration-[240ms] before:ease-[var(--ease-out)] motion-move";

export function WorkRow({ title, subtitle, id, meta, metaLate, tone, statusLabel, statusIcon, left, selected, mended, leaving, onMended, onClick, href, actions, rowId }: WorkRowProps) {
  const name = displayName(title);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "?";
  const className = cn(rowClass, selected && "bg-accent hover-fine:bg-accent before:scale-y-100", actions && "[@media(hover:none)]:pb-14");
  const children = <>
    <TimeRing tone={mended ? "done" : tone} left={left} initials={initials} />
    <span className="min-w-0">
      <span className="flex min-w-0 items-baseline gap-2">
        <strong onAnimationEnd={event => { if (event.animationName === "mend-stitch") onMended?.(); }} className={cn("t-label truncate text-text-primary", mended && "mend-stitch")}>{name}</strong>
        {id && <span className="t-id shrink-0 text-text-muted">{id}</span>}
      </span>
      <span className="t-meta mt-0.5 block truncate text-text-secondary">{subtitle}</span>
    </span>
    <span className={cn("grid justify-items-end gap-1", actions && "transition-opacity duration-[var(--dur-quick)] group-hover/actions:opacity-0 group-focus-within/actions:opacity-0 group-has-[[data-state=open]]/actions:opacity-0 [@media(hover:none)]:opacity-100")}>
      <StatusPill tone={mended ? "done" : tone} icon={statusIcon}>{mended ? "Done" : statusLabel}</StatusPill>
      <span className={cn("t-caption num", metaLate && !mended ? "!font-medium text-status-overdue" : "text-text-secondary")}>{meta}</span>
    </span>
  </>;
  const row = href
    ? <MendLink href={href} aria-current={selected ? "true" : undefined} className={className}>{children}</MendLink>
    : <button type="button" onClick={onClick} aria-current={selected ? "true" : undefined} className={className}>{children}</button>;
  return <div id={rowId} data-leaving={leaving || undefined} className={cn("grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none", leaving && "grid-rows-[0fr] opacity-0")}>
    <div className={cn("group/actions relative min-h-0", leaving && "overflow-hidden")}>
      {row}
      {actions && <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover/actions:opacity-100 group-focus-within/actions:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:top-auto [@media(hover:none)]:bottom-2.5 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">{actions}</div>}
    </div>
  </div>;
}
