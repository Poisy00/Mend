"use client";
import { MendDatePicker } from "@/components/ui/mend-date-picker";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/focus-line/filter-tabs";
import { ShiftTimeline, cairoWeekdayIndex } from "./shift-timeline";
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
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => cairoWeekdayIndex(new Date()));
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
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
  const index = selectedDay;
  const day = week[index];
  const timeInput = "h-9 w-[132px] num";
  const sectionLabel = "t-meta !font-semibold text-text-secondary";
  const dayTabs = days.map((name, i) => ({ key: String(i), label: name.slice(0, 3) }));
  return <div className="max-w-5xl">
    <PageHeader eyebrow="Your work week" title="Schedule" description="Set a repeating Sunday–Saturday pattern in Cairo time. It will carry into future weeks until you change it." actions={<Button onClick={saveWeek} disabled={pending}>{pending ? "Saving…" : "Save work week"}</Button>} />
    <ShiftTimeline week={week} exceptions={exceptions} selected={selectedDay} onSelect={setSelectedDay} now={now} />
    <section className="mt-6 rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border)]" aria-label={days[index] + " schedule"}>
      <FilterTabs label="Choose a day" tabs={dayTabs} value={String(index)} onChange={key => setSelectedDay(Number(key))} className="mb-5" />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 className="t-heading min-w-[7rem]">{days[index]}</h2>
        <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={!day.off} onCheckedChange={v => patchDay(index, { off: v !== true, breaks: [], lunch: null })} />Working</label>
        {!day.off && <>
          <label className="flex items-center gap-2 text-sm text-text-secondary">From <Input aria-label={days[index] + " start"} type="time" className={timeInput} value={day.start} onChange={event => patchDay(index, { start: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">To <Input aria-label={days[index] + " end"} type="time" className={timeInput} value={day.end} onChange={event => patchDay(index, { end: event.target.value })} /></label>
        </>}
      </div>
      {!day.off && <>
        <div className="mt-5 space-y-3">
          <p className={sectionLabel}>Breaks and lunch</p>
          {day.breaks.map((pause, pauseIndex) => <div key={pauseIndex} className="flex flex-wrap items-center gap-2"><span className="w-20 text-sm">Break {pauseIndex + 1}</span><Input aria-label={days[index] + " break start"} type="time" className="w-[145px]" value={pause.start} onChange={event => patchDay(index, updatePause(day, "break", pauseIndex, "start", event.target.value))} /><span>to</span><Input aria-label={days[index] + " break end"} type="time" className="w-[145px]" value={pause.end} onChange={event => patchDay(index, updatePause(day, "break", pauseIndex, "end", event.target.value))} /><Button variant="ghost" size="sm" onClick={() => patchDay(index, { breaks: day.breaks.filter((_, i) => i !== pauseIndex) })}>Remove</Button></div>)}
          {day.breaks.length < 2 && <Button variant="secondary" size="sm" onClick={() => patchDay(index, { breaks: [...day.breaks, { start: "11:00", end: "11:15" }] })}><Plus />Add 15-minute break</Button>}
          {day.lunch ? <div className="flex flex-wrap items-center gap-2"><span className="w-20 text-sm">Lunch</span><Input aria-label={days[index] + " lunch start"} type="time" className="w-[145px]" value={day.lunch.start} onChange={event => patchDay(index, updatePause(day, "lunch", 0, "start", event.target.value))} /><span>to</span><Input aria-label={days[index] + " lunch end"} type="time" className="w-[145px]" value={day.lunch.end} onChange={event => patchDay(index, updatePause(day, "lunch", 0, "end", event.target.value))} /><Button variant="ghost" size="sm" onClick={() => patchDay(index, { lunch: null })}>Remove</Button></div> : <Button variant="secondary" size="sm" onClick={() => patchDay(index, { lunch: { start: "13:00", end: "13:30" } })}><Plus />Add 30-minute lunch</Button>}
        </div>
        <div className="mt-6 flex justify-between border-t border-border pt-5"><Button variant="ghost" size="sm" onClick={() => { const copied=applyDayToWeek(day);const result=validateWeeklyPattern(copied);if(!result.valid){toast.error(result.errors[0]);return;}setWeek(copied);toast.success(`${days[index]} copied to all seven days. Save the work week to keep it.`); }}>Apply to all days</Button></div>
      </>}
    </section>
    <section className="mt-10 border-t border-border pt-8">
      <p className={sectionLabel}>Exceptions</p>
      <h2 className="t-heading mt-1">One-day exception</h2>
      <p className="mt-2 text-sm text-text-secondary">Override the repeating pattern for one Cairo calendar date.</p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="space-y-2"><span className="block text-sm font-medium">Cairo date</span><MendDatePicker mode="date" value={exceptionDate} onValueChange={date => { setExceptionDate(date); const old = exceptions.find(item => item.date === date); setExceptionPlan(old?.plan ?? blankDay()); }} aria-label="Cairo date" /></label>
        <label className="flex h-9 items-center gap-2 text-sm font-medium"><Checkbox checked={exceptionPlan.off} onCheckedChange={v => setExceptionPlan(current => ({ ...current, off: v === true, breaks: [], lunch: null }))} />Day off</label>
        {!exceptionPlan.off && <><label className="space-y-2"><span className="block text-sm font-medium">Start</span><Input type="time" className={timeInput} value={exceptionPlan.start} onChange={event => setExceptionPlan(current => ({ ...current, start: event.target.value }))} /></label><label className="space-y-2"><span className="block text-sm font-medium">End</span><Input type="time" className={timeInput} value={exceptionPlan.end} onChange={event => setExceptionPlan(current => ({ ...current, end: event.target.value }))} /></label></>}
        <Button variant="secondary" onClick={saveException}>Save exception</Button>
      </div>
      {exceptions.length > 0 && <div className="mt-6 divide-y divide-border border-y border-border">{exceptions.map(item => <div key={item.date} className="flex justify-between py-3"><span className="t-id">{item.date}</span><span className="t-meta num text-text-secondary">{item.plan.off ? "Day off" : item.plan.start + "–" + item.plan.end}</span></div>)}</div>}
    </section>
  </div>;
}
