"use client";
import { MendDatePicker } from "@/components/ui/mend-date-picker";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyDayToWeek, emptyWeek, validateWeeklyPattern, type DayPlan, type Pause, type WeekPattern } from "@/lib/schedule/rules";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const blankDay = (): DayPlan => ({ off: false, start: "09:00", end: "17:00", breaks: [], lunch: null });

type InitialSchedule = { week: WeekPattern; revision: number; exceptions: { date: string; plan: DayPlan }[] };

export function WeeklyGrid({ initialSchedule }: { initialSchedule: InitialSchedule }) {
  const [week, setWeek] = useState<WeekPattern>(initialSchedule.week);
  const [revision, setRevision] = useState(initialSchedule.revision);
  const [pending, setPending] = useState(false);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionPlan, setExceptionPlan] = useState<DayPlan>(blankDay());
  const [exceptions, setExceptions] = useState<{ date: string; plan: DayPlan }[]>(initialSchedule.exceptions);
  function patchDay(index: number, changes: Partial<DayPlan>) {
    setWeek(current => current.map((day, i) => i === index ? { ...day, ...changes } : day) as WeekPattern);
  }
  function updatePause(day: DayPlan, type: "break" | "lunch", index: number, field: keyof Pause, value: string) {
    if (type === "lunch") return { lunch: { ...(day.lunch ?? { start: "13:00", end: "13:30" }), [field]: value } };
    return { breaks: day.breaks.map((pause, i) => i === index ? { ...pause, [field]: value } : pause) };
  }
  async function saveWeek() {
    const validation = validateWeeklyPattern(week);
    if (!validation.valid) { toast.error(validation.errors[0]); return; }
    setPending(true);
    try {
      const response = await fetch("/api/schedule", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ week, expectedRevision: revision }) });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision(data.revision);
      toast.success("Weekly schedule saved");
    } catch (issue) { toast.error(issue instanceof Error ? issue.message : "Unable to save schedule"); }
    finally { setPending(false); }
  }
  async function saveException() {
    if (!exceptionDate) { toast.error("Choose a Cairo date"); return; }
    const testWeek = emptyWeek();
    testWeek[new Date(exceptionDate + "T12:00:00Z").getUTCDay()] = exceptionPlan;
    const result = validateWeeklyPattern(testWeek);
    if (!result.valid) { toast.error(result.errors[0]); return; }
    const response = await fetch("/api/schedule/exceptions/" + exceptionDate, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: exceptionPlan }) });
    if (!response.ok) { toast.error("Unable to save exception"); return; }
    setExceptions(current => [...current.filter(item => item.date !== exceptionDate), { date: exceptionDate, plan: exceptionPlan }].sort((a,b) => a.date.localeCompare(b.date)));
    toast.success("One-day exception saved");
  }
  return <div className="max-w-5xl">
    <p className="text-sm font-medium text-primary">YOUR WORK WEEK</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Schedule</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Set a repeating Sunday–Saturday pattern in Cairo time. It will carry into future weeks until you change it.</p>
    <div className="mt-9 border-t border-border">
      {week.map((day, index) => <div key={days[index]} className="border-b border-border py-5">
        <div className="grid gap-3 sm:grid-cols-[140px_110px_1fr_1fr] sm:items-center">
          <strong>{days[index]}</strong>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!day.off} onChange={event => patchDay(index, { off: !event.target.checked, breaks: [], lunch: null })} />Working</label>
          {!day.off && <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">From <Input aria-label={days[index] + " start"} type="time" value={day.start} onChange={event => patchDay(index, { start: event.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">To <Input aria-label={days[index] + " end"} type="time" value={day.end} onChange={event => patchDay(index, { end: event.target.value })} /></label>
          </>}
        </div>
        {!day.off && <details className="mt-4 rounded-lg bg-muted/40 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Breaks and lunch</summary>
          <div className="mt-4 space-y-4">
            {day.breaks.map((pause, pauseIndex) => <div key={pauseIndex} className="flex flex-wrap items-center gap-2"><span className="w-20 text-sm">Break {pauseIndex + 1}</span><Input aria-label={days[index] + " break start"} type="time" className="w-[145px]" value={pause.start} onChange={event => patchDay(index, updatePause(day, "break", pauseIndex, "start", event.target.value))} /><span>to</span><Input aria-label={days[index] + " break end"} type="time" className="w-[145px]" value={pause.end} onChange={event => patchDay(index, updatePause(day, "break", pauseIndex, "end", event.target.value))} /><Button variant="ghost" size="sm" onClick={() => patchDay(index, { breaks: day.breaks.filter((_, i) => i !== pauseIndex) })}>Remove</Button></div>)}
            {day.breaks.length < 2 && <Button variant="outline" size="sm" onClick={() => patchDay(index, { breaks: [...day.breaks, { start: "11:00", end: "11:15" }] })}>Add 15-minute break</Button>}
            {day.lunch ? <div className="flex flex-wrap items-center gap-2"><span className="w-20 text-sm">Lunch</span><Input aria-label={days[index] + " lunch start"} type="time" className="w-[145px]" value={day.lunch.start} onChange={event => patchDay(index, updatePause(day, "lunch", 0, "start", event.target.value))} /><span>to</span><Input aria-label={days[index] + " lunch end"} type="time" className="w-[145px]" value={day.lunch.end} onChange={event => patchDay(index, updatePause(day, "lunch", 0, "end", event.target.value))} /><Button variant="ghost" size="sm" onClick={() => patchDay(index, { lunch: null })}>Remove</Button></div> : <Button variant="outline" size="sm" onClick={() => patchDay(index, { lunch: { start: "13:00", end: "13:30" } })}>Add 30-minute lunch</Button>}
          </div>
        </details>}
        {!day.off && <Button variant="ghost" size="sm" className="mt-3" onClick={() => { const copied=applyDayToWeek(day);const result=validateWeeklyPattern(copied);if(!result.valid){toast.error(result.errors[0]);return;}setWeek(copied);toast.success(`${days[index]} copied to all seven days. Save the work week to keep it.`); }}>Apply this day’s schedule to all days</Button>}
      </div>)}
    </div>
    <div className="mt-6 flex justify-end"><Button onClick={saveWeek} disabled={pending} className="min-w-[150px]">{pending ? "Saving…" : "Save work week"}</Button></div>
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-xl font-semibold">One-day exception</h2>
      <p className="mt-2 text-sm text-muted-foreground">Override the repeating pattern for one Cairo calendar date.</p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="space-y-2"><span className="block text-sm font-medium">Cairo date</span><MendDatePicker mode="date" value={exceptionDate} onValueChange={date => { setExceptionDate(date); const old = exceptions.find(item => item.date === date); setExceptionPlan(old?.plan ?? blankDay()); }} aria-label="Cairo date" /></label>
        <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={exceptionPlan.off} onChange={event => setExceptionPlan(current => ({ ...current, off: event.target.checked, breaks: [], lunch: null }))} />Day off</label>
        {!exceptionPlan.off && <><label className="space-y-2"><span className="block text-sm font-medium">Start</span><Input type="time" value={exceptionPlan.start} onChange={event => setExceptionPlan(current => ({ ...current, start: event.target.value }))} /></label><label className="space-y-2"><span className="block text-sm font-medium">End</span><Input type="time" value={exceptionPlan.end} onChange={event => setExceptionPlan(current => ({ ...current, end: event.target.value }))} /></label></>}
        <Button onClick={saveException}>Save exception</Button>
      </div>
      {exceptions.length > 0 && <div className="mt-6 divide-y divide-border border-y border-border">{exceptions.map(item => <div key={item.date} className="flex justify-between py-3 text-sm"><span>{item.date}</span><span className="text-muted-foreground">{item.plan.off ? "Day off" : item.plan.start + "–" + item.plan.end}</span></div>)}</div>}
    </section>
  </div>;
}
