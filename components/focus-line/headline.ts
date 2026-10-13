export const numberWords = ["One", "Two", "Three", "Four", "Five"];

/** "Monday, October 12" in Cairo time. */
export function cairoDateLabel(nowMs: number) {
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "long", month: "long", day: "numeric" }).formatToParts(nowMs);
  const part = (type: string) => date.find(entry => entry.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("month")} ${part("day")}`;
}

/** The Today headline and sub line, shared with Follow-ups. */
export function focusHeadline({ overdue, due, soon, open }: { overdue: number; due: number; soon: number; open: number }, soonText = "due within the hour") {
  const headline = overdue
    ? `${numberWords[overdue - 1] ?? overdue} callback${overdue === 1 ? " is" : "s are"} late.`
    : open ? "You're on time." : "Queue clear.";
  const parts = [due && `${due} due now`, soon && `${soon} ${soonText}`].filter(Boolean).join(", ");
  const description = parts ? `${parts[0].toUpperCase()}${parts.slice(1)}.` : "";
  return { headline, late: overdue > 0, description };
}
