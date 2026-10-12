export type QueueCounts = { overdue: number; now: number; soon: number; waiting: number };

/** The live status sentence shared by Today and Follow-ups. */
export function QueueSummary({ counts }: { counts: QueueCounts }) {
  const segments = [
    { n: counts.overdue, text: "overdue", className: "text-status-overdue" },
    { n: counts.now, text: "due now", className: "text-status-due" },
    { n: counts.soon, text: "within the hour", className: "text-foreground" },
    { n: counts.waiting, text: "later", className: "text-text-secondary" },
  ].filter(segment => segment.n > 0);
  if (!segments.length) return <>Nothing waiting. Your queue is clear.</>;
  return <>{segments.map((segment, index) => <span key={segment.text}>{index > 0 && " · "}<span className={`num font-medium ${segment.className}`}>{segment.n} {segment.text}</span></span>)}</>;
}
