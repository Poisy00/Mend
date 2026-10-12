"use client";

import { useEffect, useState } from "react";
import { shiftSummary, type DayException, type WeekPattern } from "@/lib/schedule/rules";

const toMinutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
const hourLabel = (minute: number) => { const h = Math.floor(minute / 60) % 24; return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`; };

export function ShiftBlock({ week, exceptions, now: serverNow }: { week: WeekPattern; exceptions: DayException[]; now: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const summary = shiftSummary(week, exceptions, new Date(now));
  const { day } = summary;
  const start = toMinutes(day.start), end = start + ((toMinutes(day.end) - start + 1440) % 1440);
  const axisStart = Math.floor(start / 180) * 180, axisEnd = Math.ceil(end / 180) * 180, span = Math.max(axisEnd - axisStart, 180);
  const pct = (minute: number) => `${((minute - axisStart) / span) * 100}%`;
  let marker = summary.nowMinute;
  if (marker < start) marker += 1440;
  const showMarker = summary.state !== "off" && marker <= end;
  const pauses = [...day.breaks, ...(day.lunch ? [day.lunch] : [])].map(pause => {
    let a = toMinutes(pause.start);
    while (a < start) a += 1440;
    return { a, b: a + ((toMinutes(pause.end) - toMinutes(pause.start) + 1440) % 1440) };
  });
  const mid = axisStart + span / 2;
  const labels = [axisStart, ...(mid % 60 === 0 ? [mid] : []), axisStart + span];

  return <div>
    <p className="t-heading">{summary.headline}</p>
    <p className="t-meta num mt-0.5 text-text-secondary">{summary.detail}</p>
    {!day.off && <div className="mt-4" aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-muted">
        <span className="absolute inset-y-0 rounded-full bg-primary" style={{ left: pct(start), width: `${((end - start) / span) * 100}%` }} />
        {pauses.map((pause, index) => <span key={index} className="absolute inset-y-0" style={{ left: pct(pause.a), width: `${((pause.b - pause.a) / span) * 100}%`, backgroundImage: "repeating-linear-gradient(135deg, var(--accent) 0 2px, var(--primary-hover) 2px 4px)" }} />)}
        {showMarker && <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-status-overdue before:absolute before:-top-0.5 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:rounded-full before:bg-status-overdue" style={{ left: pct(marker) }} />}
      </div>
      <div className="relative mt-2 h-4">{labels.map((minute, index) => <span key={minute} className={`t-id absolute whitespace-nowrap !text-[11px] text-text-muted ${index === 0 ? "" : index === labels.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: pct(minute) }}>{hourLabel(minute)}</span>)}</div>
    </div>}
  </div>;
}
