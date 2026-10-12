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

export function StatusPill({ tone, children, icon, className }: { tone: Tone; children: ReactNode; icon?: "open" | "scheduled" | "handoff" | "closed"; className?: string }) {
  const Icon = icon ? overrideIcon[icon] : toneIcon[tone];
  return <span data-status={tone} className={cn("t-caption inline-flex h-[22px] items-center gap-1 rounded-full pl-1.5 pr-2 !font-medium whitespace-nowrap", toneClass[tone], className)}><Icon aria-hidden="true" strokeWidth={2} className="size-[13px]" />{children}</span>;
}

const ring = { 32: { size: "size-8", r: 15, c: 94.25, box: 32, text: "text-[11px]" }, 40: { size: "size-10", r: 18, c: 113.1, box: 40, text: "text-xs" } } as const;

export function TimeRing({ tone, left, initials, size = 32 }: { tone: Tone; left: number; initials: string; size?: 32 | 40 }) {
  const g = ring[size];
  const fill = tone === "overdue" || tone === "done" ? 1 : left;
  return <span className={cn("relative grid shrink-0 place-items-center rounded-full bg-sheet font-semibold tracking-[.02em]", g.size, g.text, tone === "overdue" ? "text-status-overdue" : "text-text-secondary")}>
    <svg viewBox={`0 0 ${g.box} ${g.box}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx={g.box / 2} cy={g.box / 2} r={g.r} style={{ fill: "none", stroke: "var(--border)", strokeWidth: 2 }} />
      {tone !== "closed" && <circle cx={g.box / 2} cy={g.box / 2} r={g.r} strokeLinecap="round" strokeDasharray={g.c} strokeDashoffset={g.c * (1 - fill)} style={{ fill: "none", stroke: `var(--status-${tone === "scheduled" ? "scheduled" : tone})`, strokeWidth: 2, transition: "stroke-dashoffset 240ms var(--ease-out), stroke 240ms var(--ease-out)" }} />}
    </svg>
    {initials}
  </span>;
}
