"use client";

import { cn } from "@/lib/utils";
import { activeShift, type DayException, type DayPlan, type WeekPattern } from "@/lib/schedule/rules";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const toMinutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
const clock = (value: string) => { const [h, m] = value.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const hourLabel = (minute: number) => { const h = Math.floor(minute / 60) % 24; return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`; };
const length = (minutes: number) => { const h = Math.floor(minutes / 60), m = minutes % 60; return m ? `${h}h ${m}m` : `${h}h`; };
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function cairoNow(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map(item => [item.type, item.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function cairoWeekdayIndex(now: Date) {
  return new Date(`${cairoNow(now).date}T12:00:00Z`).getUTCDay();
}

type Row = { index: number; date: string; plan: DayPlan; exception: boolean; s: number; e: number; pauses: { a: number; b: number }[] };

export function ShiftTimeline({ week, exceptions, selected, onSelect, now }: { week: WeekPattern; exceptions: DayException[]; selected: number; onSelect: (index: number) => void; now: Date }) {
  const today = cairoNow(now);
  const todayIndex = new Date(`${today.date}T12:00:00Z`).getUTCDay();
  const sunday = Date.parse(`${today.date}T12:00:00Z`) - todayIndex * 86_400_000;
  const plans = week.map((weekPlan, index) => {
    const date = iso(sunday + index * 86_400_000);
    const override = exceptions.find(item => item.date === date);
    const plan = override ? override.plan : weekPlan;
    const s0 = toMinutes(plan.start);
    return { index, date, plan, exception: Boolean(override), s0, e0: s0 + ((toMinutes(plan.end) - s0 + 1440) % 1440) };
  });
  // Early-morning days that fit inside the overnight tail sit after midnight on the same axis, so night shifts stay one bar.
  const tail = Math.max(0, ...plans.filter(row => !row.plan.off).map(row => row.e0 - 1440));
  const rows: Row[] = plans.map(({ s0, e0, ...row }) => {
    const shiftDay = tail > 0 && !row.plan.off && s0 < 720 && e0 <= tail ? 1440 : 0;
    const s = s0 + shiftDay, e = e0 + shiftDay;
    const pauses = [...row.plan.breaks, ...(row.plan.lunch ? [row.plan.lunch] : [])].map(pause => {
      let a = toMinutes(pause.start);
      while (a < s) a += 1440;
      return { a, b: a + ((toMinutes(pause.end) - toMinutes(pause.start) + 1440) % 1440) };
    });
    return { ...row, s, e, pauses };
  });
  const working = rows.filter(row => !row.plan.off);
  const axisStart = working.length ? Math.floor(Math.min(...working.map(row => row.s)) / 180) * 180 : 540;
  const axisEnd = working.length ? Math.ceil(Math.max(...working.map(row => row.e)) / 180) * 180 : 1080;
  const span = Math.min(axisEnd - axisStart, 1440);
  const labels: number[] = [];
  for (let t = axisStart; t <= axisStart + span; t += 180) labels.push(t);
  const pct = (minute: number) => `${((minute - axisStart) / span) * 100}%`;

  const shift = activeShift(week, exceptions, now);
  const yesterday = iso(Date.parse(`${today.date}T12:00:00Z`) - 86_400_000);
  let activeIndex = shift.working ? rows.find(row => row.plan === shift.day && (row.date === today.date || row.date === yesterday))?.index ?? -1 : -1;
  const markerFor = (row: Row) => {
    let minute = today.minute;
    if (minute < row.s) minute += 1440;
    return minute >= row.s && minute <= row.e ? minute : null;
  };
  if (activeIndex < 0) { const row = rows[todayIndex]; if (!row.plan.off && markerFor(row) !== null) activeIndex = todayIndex; }

  const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(Date.parse(`${date}T12:00:00Z`));

  return <div className="mt-8 rounded-[14px] bg-sheet p-3 shadow-[0_0_0_1px_var(--border)]">
    <div className="grid grid-cols-[112px_minmax(0,1fr)_132px] gap-x-4 px-3 pb-2" aria-hidden="true">
      <span />
      <div className="relative h-4">{labels.map((t, i) => <span key={t} className={cn("t-id absolute whitespace-nowrap text-[11px] text-text-muted", i === 0 ? "translate-x-0" : i === labels.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: pct(t) }}>{hourLabel(t)}</span>)}</div>
      <span />
    </div>
    <div>
      {rows.map(row => {
        const isActive = row.index === activeIndex;
        const marker = isActive ? markerFor(row) : null;
        const off = row.plan.off;
        const sub = row.date === today.date ? "Today" : row.exception ? "Exception" : off ? "Day off" : dateLabel(row.date);
        const barStyle = row.exception
          ? { left: pct(row.s), width: `${((row.e - row.s) / span) * 100}%`, backgroundImage: "repeating-linear-gradient(135deg, var(--accent) 0 4px, transparent 4px 8px)" }
          : { left: pct(row.s), width: `${((row.e - row.s) / span) * 100}%` };
        return <button key={row.index} type="button" aria-pressed={selected === row.index} onClick={() => onSelect(row.index)} className={cn("grid w-full grid-cols-[112px_minmax(0,1fr)_132px] items-center gap-x-4 rounded-[10px] px-3 py-1 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", row.index > 0 && "border-t border-border", selected === row.index && "bg-accent hover:bg-accent")}>
          <span className={cn("t-label !text-[15px] !font-semibold", off && "text-text-secondary")}>{dayNames[row.index]}<small className="t-caption mt-0.5 block !font-normal text-text-secondary">{sub}</small></span>
          <span className="relative h-14">
            <span aria-hidden="true" className="absolute inset-0 opacity-70" style={{ backgroundImage: `repeating-linear-gradient(90deg, var(--border) 0 1px, transparent 1px calc(100% / ${span / 180}))` }} />
            {!off && <>
              <span className={cn("absolute top-4 h-6 rounded-md", row.exception ? "bg-transparent shadow-[inset_0_0_0_1.5px_var(--primary)]" : "bg-accent shadow-[inset_0_0_0_1.5px_var(--primary)]")} style={barStyle} />
              {row.pauses.map((pause, i) => <span key={i} className="absolute top-4 h-6 bg-secondary shadow-[inset_0_0_0_1px_var(--control-edge)]" style={{ left: pct(pause.a), width: `${((pause.b - pause.a) / span) * 100}%` }} />)}
              {marker !== null && marker >= axisStart && marker <= axisStart + span && <span className="absolute top-1.5 bottom-1.5 w-0.5 rounded-full bg-status-overdue before:absolute before:-top-1 before:left-1/2 before:size-2 before:-translate-x-1/2 before:rounded-full before:bg-status-overdue" style={{ left: pct(marker) }} />}
            </>}
          </span>
          <span className="text-right">
            <span className="t-meta num !font-medium">{off ? "—" : `${clock(row.plan.start)}–${clock(row.plan.end)}`}</span>
            <small className="t-caption mt-0.5 block !font-normal text-text-secondary">{off ? "Off" : isActive && marker !== null ? `On shift, ${Math.floor((row.e - marker) / 60)}h ${(row.e - marker) % 60}m left` : `${length(row.e - row.s)}, ${row.plan.breaks.length} break${row.plan.breaks.length === 1 ? "" : "s"}${row.plan.lunch ? ", lunch" : ""}`}</small>
          </span>
        </button>;
      })}
    </div>
  </div>;
}
