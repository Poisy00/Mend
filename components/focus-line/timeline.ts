import type { FollowUp } from "@/lib/follow-ups/types";

export type LineEntry<T> = { kind: "item"; item: T } | { kind: "now" } | { kind: "day"; label: string };

export const cairoDay = (ms: number) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(ms).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};
export const cairoFormat = (options: Intl.DateTimeFormatOptions, ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", ...options }).format(ms);
export function dayLabel(ms: number, nowMs: number) {
  const diff = cairoDay(ms) - cairoDay(nowMs);
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 6) return cairoFormat({ weekday: "short" }, ms);
  const sameYear = cairoFormat({ year: "numeric" }, ms) === cairoFormat({ year: "numeric" }, nowMs);
  return cairoFormat({ month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }, ms);
}
export const byDue = (a: FollowUp, b: FollowUp) => Date.parse(a.dueAt) - Date.parse(b.dueAt);
export const gutterTime = (iso: string, zone: string) => new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(Date.parse(iso));

/**
 * Lays rows out as the line: today's rows, the Now row between past and future, then a divider per later day.
 * `items` must already be sorted by due time. The Now row is skipped when `showNow` is false.
 */
export function buildLineEntries<T extends { dueAt: string }>(items: T[], now: number, showNow: boolean): LineEntry<T>[] {
  const today = cairoDay(now);
  const entries: LineEntry<T>[] = [];
  let previousDay = today;
  let dividerShown = false;
  let nowPlaced = !showNow || !items.some(item => cairoDay(Date.parse(item.dueAt)) === today);
  for (const item of items) {
    const due = Date.parse(item.dueAt);
    const day = cairoDay(due);
    if (day === today && previousDay !== today && dividerShown) entries.push({ kind: "day", label: "Today" });
    if (!nowPlaced && due >= now) { entries.push({ kind: "now" }); nowPlaced = true; }
    if (day !== today && day !== previousDay) { entries.push({ kind: "day", label: dayLabel(due, now) }); dividerShown = true; }
    previousDay = day;
    entries.push({ kind: "item", item });
  }
  if (!nowPlaced) entries.push({ kind: "now" });
  return entries;
}
