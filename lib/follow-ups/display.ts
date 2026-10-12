import type { CaseRecord } from "@/lib/cases/types";
import { classifyFollowUp } from "./rules";
import type { FollowUp } from "./types";

export type Tone = "overdue" | "due" | "scheduled" | "done" | "closed";

function dur(ms: number): string {
  const mins = Math.max(Math.floor(ms / 60000), 0);
  if (mins < 120) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

const dayIndex = (zone: string, ms: number) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Absolute time for a row: no date for today, weekday within the week, no year for this year. */
export function dueCaption(item: FollowUp, nowMs: number): string {
  const zone = item.sourceTimezone, due = Date.parse(item.dueAt);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(due);
  const diff = dayIndex(zone, due) - dayIndex(zone, nowMs);
  if (diff === 0) return time;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff > 1 && diff <= 6) return `${new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(due)} ${time}`;
  const year = (ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric" }).format(ms);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric", ...(year(due) !== year(nowMs) ? { year: "numeric" } : {}) }).format(due);
  return `${date}, ${time}`;
}

export type QueueGroup = "overdue" | "now" | "soon" | "waiting";
export const queueGroupLabel: Record<QueueGroup, string> = { overdue: "Overdue", now: "Due now", soon: "Within the hour", waiting: "Later" };

export function followUpDisplay(item: FollowUp, nowMs: number): { tone: Tone; label: string; left: number } {
  const bucket = classifyFollowUp(item, nowMs);
  if (bucket === "completed") return item.status === "completed" ? { tone: "done", label: "Done", left: 1 } : { tone: "closed", label: "Closed", left: 0 };
  const due = Date.parse(item.dueAt);
  if (bucket === "overdue") return { tone: "overdue", label: "Overdue " + dur(nowMs - due), left: 1 };
  const left = Math.min(1, Math.max(0, (due - nowMs) / (120 * 60000)));
  if (bucket === "now") return { tone: "due", label: "Due now", left };
  if (bucket === "soon") return { tone: "due", label: "In " + Math.max(Math.ceil((due - nowMs) / 60000), 1) + " min", left };
  const sameDay = dayIndex(item.sourceTimezone, due) === dayIndex(item.sourceTimezone, nowMs);
  return { tone: "scheduled", label: sameDay ? "Today" : "Scheduled", left: 1 };
}

export function caseDisplay(c: CaseRecord): { tone: Tone; label: string; icon: "open" | "scheduled" | "handoff" | "closed" } {
  switch (c.status) {
    case "Follow-up scheduled": return { tone: "scheduled", label: "Follow-up scheduled", icon: "scheduled" };
    case "Handoff prepared": return { tone: "scheduled", label: "Handoff prepared", icon: "handoff" };
    case "Closed": return { tone: "closed", label: "Closed", icon: "closed" };
    default: return { tone: "scheduled", label: "Open", icon: "open" };
  }
}
