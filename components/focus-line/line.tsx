"use client";

import type { ReactNode } from "react";
import { AlarmClock, Check } from "lucide-react";
import { MendLink as Link } from "@/components/mend-link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { displayName } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { snoozeOptions } from "./actions";

export type LineNode = "overdue" | "now" | "soon" | "waiting" | "done" | "iris";

const nodeTone: Record<LineNode, string> = {
  overdue: "bg-status-overdue shadow-[0_0_0_3px_var(--status-overdue-tint)]",
  now: "bg-status-due shadow-[0_0_0_3px_var(--status-due-tint)]",
  soon: "bg-sheet shadow-[0_0_0_2px_var(--primary)]",
  waiting: "bg-sheet shadow-[0_0_0_2px_var(--text-muted)]",
  done: "bg-status-done shadow-[0_0_0_3px_var(--status-done-tint)]",
  iris: "bg-primary shadow-[0_0_0_3px_var(--accent)]",
};
const actionButton = "relative bg-sheet shadow-chip before:absolute before:-inset-1 hover-fine:bg-surface-hover";
const spine = "relative self-stretch grid place-items-center before:absolute before:left-1/2 before:w-0.5 before:-translate-x-px before:bg-border";
export const spineEnds = (first: boolean, last: boolean) => cn(first ? "before:top-1/2" : "before:top-0", last ? "before:bottom-1/2" : "before:bottom-0");
const rowClass = "relative grid w-full min-h-[68px] grid-cols-[68px_22px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[10px] pr-3 text-left outline-none transition-colors duration-[var(--dur-quick)] hover-fine:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const lineRow = "grid grid-cols-[68px_22px_minmax(0,1fr)] items-center gap-x-3";

/** The iris rule that separates past from future. */
export function LineNow({ clock, ends }: { clock: string; ends: string }) {
  return <li aria-label={`Now ${clock}`} className={cn(lineRow, "h-7")}>
    <span className="t-meta num text-right font-semibold text-primary">{clock}</span>
    <span className={cn(spine, ends)}><span className="relative size-3 rounded-full bg-primary shadow-[0_0_0_4px_var(--accent)]" /></span>
    <span className="relative h-0.5 rounded-full bg-primary"><span className="t-caption absolute -top-2.5 right-0 bg-sheet pl-2 font-semibold text-primary">Now</span></span>
  </li>;
}

export function LineDay({ label, ends }: { label: string; ends: string }) {
  return <li className={cn(lineRow, "h-11")}>
    <span />
    <span className={cn(spine, ends)}><span className="relative h-0.5 w-2 bg-text-muted" /></span>
    <span className="t-meta font-semibold text-text-secondary">{label}</span>
  </li>;
}

/** One follow-up on the line: time gutter, spine node, name and ID, reason, status label, hover actions. */
export function LineRow({ id, ends, gutter, node, name, ident, tag, subtitle, label, labelTone, quiet, selected, href, onSelect, mended, leaving, onStitchEnd, actions }: {
  id: string; ends: string; gutter: string; node: LineNode; name: string; ident: string; tag?: ReactNode; subtitle: string;
  label: string; labelTone?: "overdue" | "now"; quiet?: boolean; selected: boolean; href?: string; onSelect: () => void;
  mended: boolean; leaving: boolean; onStitchEnd: () => void; actions?: ReactNode;
}) {
  const className = cn(rowClass, selected && "bg-accent hover-fine:bg-accent", actions && "[@media(hover:none)]:pb-14");
  const children = <>
    <span className="t-meta num text-right text-text-secondary">{gutter}</span>
    <span className={cn(spine, ends)}><span className={cn("relative size-2.5 rounded-full", nodeTone[node])} /></span>
    <span className="min-w-0 py-2">
      <span className="flex min-w-0 items-baseline gap-2">
        <strong onAnimationEnd={event => { if (event.animationName === "mend-stitch") onStitchEnd(); }} className={cn("t-label truncate !text-[15px]", quiet ? "!font-medium text-text-secondary" : "!font-semibold text-text-primary", mended && "mend-stitch")}>{displayName(name)}</strong>
        {tag}
        <span className="t-id shrink-0 text-text-muted">{ident}</span>
      </span>
      <span className="t-meta block truncate text-text-secondary">{subtitle}</span>
    </span>
    <span className={cn("t-meta whitespace-nowrap text-text-secondary", actions && "transition-opacity duration-[var(--dur-quick)] group-hover/actions:opacity-0 group-focus-within/actions:opacity-0 group-has-[[data-state=open]]/actions:opacity-0 [@media(hover:none)]:opacity-100", labelTone === "overdue" && "!font-semibold text-status-overdue", labelTone === "now" && "!font-semibold text-status-due")}>{label}</span>
  </>;
  return <li data-leaving={leaving || undefined} className={cn("grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none", leaving && "grid-rows-[0fr] opacity-0")}>
    <div className={cn("group/actions relative min-h-0", leaving && "overflow-hidden")}>
      {href
        ? <Link href={href} data-row-id={id} className={className}>{children}</Link>
        : <button type="button" data-row-id={id} onClick={onSelect} aria-current={selected ? "true" : undefined} className={className}>{children}</button>}
      {actions && <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover/actions:opacity-100 group-focus-within/actions:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:top-auto [@media(hover:none)]:bottom-2.5 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">{actions}</div>}
    </div>
  </li>;
}

/** Resolve and Snooze buttons that appear on hover or focus. `snoozeOpen` lets a keyboard shortcut open the menu. */
export function LineActions({ name, onResolve, onSnooze, snoozeOpen, onSnoozeOpenChange }: {
  name: string; onResolve: () => void; onSnooze: (minutes: number) => void; snoozeOpen?: boolean; onSnoozeOpenChange?: (open: boolean) => void;
}) {
  return <>
    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className={actionButton} aria-label={`Mark ${name} resolved`} onClick={onResolve}><Check /></Button></TooltipTrigger><TooltipContent>Mark resolved</TooltipContent></Tooltip>
    <DropdownMenu open={snoozeOpen} onOpenChange={onSnoozeOpenChange}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className={actionButton} aria-label={`Snooze ${name}`}><AlarmClock /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">{snoozeOptions.map(option => <DropdownMenuItem key={option.minutes} onSelect={() => onSnooze(option.minutes)}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
  </>;
}
