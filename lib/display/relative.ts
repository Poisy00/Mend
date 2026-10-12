/** Short relative time such as "2 h ago". Accepts ISO strings and SQLite "YYYY-MM-DD HH:MM:SS" (UTC). */
export function relativeTime(value: string, nowMs: number): string {
  const text = /^\d{4}-\d\d-\d\d \d/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const minutes = Math.max(0, Math.floor((nowMs - Date.parse(text)) / 60_000));
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  return `${Math.floor(minutes / 1440)} d ago`;
}
