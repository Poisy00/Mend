import type { CaseRecord } from "@/lib/cases/types";
import { classifyFollowUp } from "./rules";
import type { FollowUp } from "./types";

export type Tone = "overdue" | "due" | "scheduled" | "done" | "closed";

function dur(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(mins, 0)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) { const rest = mins % 60; return rest ? `${hours}h ${rest}m` : `${hours}h`; }
  return `${Math.floor(hours / 24)} d`;
}

function when(item: FollowUp, due: number, nowMs: number): string {
  const zone = item.sourceTimezone;
  const day = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
  const dayIndex = (ms: number) => { const [y, m, d] = day(ms).split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
  const time = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(due);
  const diff = dayIndex(due) - dayIndex(nowMs);
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff > 1 && diff <= 6) return `${new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(due)} ${time}`;
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(due);
}

export function followUpDisplay(item: FollowUp, nowMs: number): { tone: Tone; label: string; left: number } {
  const bucket = classifyFollowUp(item, nowMs);
  if (bucket === "completed") return item.status === "completed" ? { tone: "done", label: "Done", left: 1 } : { tone: "closed", label: "Closed", left: 0 };
  const due = Date.parse(item.dueAt);
  if (bucket === "overdue") return { tone: "overdue", label: "Overdue " + dur(nowMs - due), left: 1 };
  const left = Math.min(1, Math.max(0, (due - nowMs) / (240 * 60000)));
  if (bucket === "now" || bucket === "soon") {
    const mins = Math.ceil((due - nowMs) / 60000);
    return { tone: "due", label: mins <= 1 ? "Due now" : "Due in " + mins + " min", left };
  }
  return { tone: "scheduled", label: when(item, due, nowMs), left };
}

export function caseDisplay(c: CaseRecord): { tone: Tone; label: string; icon: "open" | "scheduled" | "handoff" | "closed" } {
  switch (c.status) {
    case "Follow-up scheduled": return { tone: "scheduled", label: "Follow-up scheduled", icon: "scheduled" };
    case "Handoff prepared": return { tone: "scheduled", label: "Handoff prepared", icon: "handoff" };
    case "Closed": return { tone: "closed", label: "Closed", icon: "closed" };
    default: return { tone: "scheduled", label: "Open", icon: "open" };
  }
}
