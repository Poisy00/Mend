import type { ReactNode } from "react";
import { Archive, Calendar, Check, CircleDot, Clock, Hourglass, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/follow-ups/display";

const toneClass: Record<Tone, string> = {
  overdue: "bg-status-overdue-tint text-status-overdue",
  due: "bg-status-due-tint text-status-due",
  scheduled: "bg-status-scheduled-tint text-status-scheduled",
  done: "bg-status-done-tint text-status-done",
  closed: "bg-status-closed-tint text-status-closed",
};
const toneIcon = { overdue: Clock, due: Hourglass, scheduled: Calendar, done: Check, closed: Archive };
const overrideIcon = { open: CircleDot, scheduled: Calendar, handoff: Send, closed: Archive };

export function StatusPill({ tone, children, icon }: { tone: Tone; children: ReactNode; icon?: "open" | "scheduled" | "handoff" | "closed" }) {
  const Icon = icon ? overrideIcon[icon] : toneIcon[tone];
  return <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full pl-1.5 pr-2 text-xs font-medium whitespace-nowrap", toneClass[tone])}><Icon aria-hidden="true" className="size-[13px]" />{children}</span>;
}

export function TimeRing({ tone, left, initials, selected }: { tone: Tone; left: number; initials: string; selected?: boolean }) {
  const fill = tone === "overdue" || tone === "done" ? 1 : left;
  return <span data-selected={selected ? "true" : undefined} className={cn("relative grid size-10 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold tracking-[.02em]", tone === "overdue" ? "text-status-overdue" : "text-text-secondary")}>
    <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r="18" style={{ fill: "none", stroke: "var(--border)", strokeWidth: 2 }} />
      {tone !== "closed" && <circle cx="20" cy="20" r="18" strokeLinecap="round" strokeDasharray={113.1} strokeDashoffset={113.1 * (1 - fill)} style={{ fill: "none", stroke: `var(--status-${tone})`, strokeWidth: 2, transition: "stroke-dashoffset 240ms cubic-bezier(.23,1,.32,1)" }} />}
    </svg>
    {initials}
  </span>;
}
