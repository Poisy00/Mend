
import { ArrowRight, CalendarClock, Headset, PhoneForwarded, Plus } from "lucide-react";
import { MendLink as Link } from "@/components/mend-link";
import { Button } from "@/components/ui/button";
import { Eyebrow, PageHeader } from "@/components/ui/page-header";
import { WorkListHeader, WorkRow } from "@/components/ui/work-row";
import { followUpDisplay } from "@/lib/follow-ups/display";
import { formatAccountIfComplete } from "@/lib/display/format";
import { requirePageSession } from "@/lib/server/page-auth";
import { listFollowUps } from "@/lib/server/follow-ups";
import { getSchedule } from "@/lib/server/schedule";
import { activeShift } from "@/lib/schedule/rules";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";

export default async function TodayPage() {
  const session = await requirePageSession();
  const now = new Date();
  const [followUps, schedule] = await Promise.all([
    listFollowUps(session.id, { limit: 100 }),
    getSchedule(session.id),
  ]);
  const next = followUps.items.filter(item => classifyFollowUp(item, now.getTime()) !== "completed").sort((a, b) => rankFollowUp(b, now.getTime()) - rankFollowUp(a, now.getTime())).slice(0, 4);
  const shift = activeShift(schedule.week, schedule.exceptions, now);
  const [endHour, endMinute] = shift.day.end.split(":").map(Number);
  const shiftEnd = `${endHour % 12 || 12}:${String(endMinute).padStart(2, "0")} ${endHour < 12 ? "AM" : "PM"}`;
  const shiftLine = shift.working ? shift.onPause ? "On a scheduled break" : "On shift · until " + shiftEnd : "Off shift";
  const shiftDot = shift.working ? shift.onPause ? "bg-status-due" : "bg-status-done" : "bg-control-edge";
  return <>
    <div className="mend-enter">
      <div className="border-b border-border pb-7"><PageHeader display eyebrow="Your workspace" title="Today, in order." description="Keep callbacks moving and prepare the next dispatch with a clear view of what needs attention." actions={<Button asChild><Link href="/follow-ups/new"><Plus />New follow-up</Link></Button>} /></div>
      <div className="grid gap-0 border-b border-border lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]">
        <section className="min-h-[410px] border-b border-border py-8 lg:border-b-0 lg:border-r lg:pr-9" aria-labelledby="queue-heading">
          <div className="mb-7 flex items-center justify-between gap-3"><div><Eyebrow>Callback queue</Eyebrow><h2 id="queue-heading" className="type-heading mt-1">Follow-ups</h2></div><Button asChild variant="ghost" size="sm"><Link href="/follow-ups">Open queue <ArrowRight /></Link></Button></div>
          {next.length ? <div className="border-t border-border"><WorkListHeader detail="Status / due" />{next.map(item => { const d = followUpDisplay(item, now.getTime()); return <WorkRow key={item.id} href="/follow-ups" eyebrow={item.caseNumber || formatAccountIfComplete(item.accountNumber)} title={item.customerName || item.accountNumber} subtitle={item.reason} meta={new Date(item.dueAt).toLocaleString("en-US", { timeZone: item.sourceTimezone, dateStyle: "medium", timeStyle: "short" })} metaLate={d.tone === "overdue"} tone={d.tone} statusLabel={d.label} left={d.left} />; })}</div> : <div className="grid min-h-[220px] place-items-center rounded-xl border border-border bg-surface/60 px-6 text-center"><div className="max-w-xs"><div className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary"><PhoneForwarded className="size-5" /></div><h3 className="mt-4 text-lg font-semibold">A clear queue starts here</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Create your first follow-up to see what is due, what can wait, and what is complete.</p></div></div>}
        </section>
        <aside className="py-8 lg:pl-9" aria-label="Quick actions">
          <Eyebrow>Next action</Eyebrow><h2 className="type-heading mt-1">Start with the right tool.</h2>
          <div className="mt-7 space-y-3">
            <Link href="/rcc" className="group flex min-h-[104px] items-center gap-4 rounded-xl border border-border bg-card px-5 transition-colors hover:border-control-edge hover:shadow-card"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Headset className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">RCC Dispatch</strong><span className="mt-1 block text-sm text-muted-foreground">Prepare an expedite or follow-up draft.</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/schedule" className="group flex min-h-[104px] items-center gap-4 rounded-xl border border-border bg-card px-5 transition-colors hover:border-control-edge hover:shadow-card"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><CalendarClock className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">Your schedule</strong><span className="mt-1 block text-sm text-muted-foreground"><span aria-hidden="true" className={"mr-2 inline-block size-2 rounded-full align-middle " + shiftDot} />{shiftLine}</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-6 text-sm"><span className="text-muted-foreground">Cases are saved only when you choose to save them.</span><Button asChild variant="ghost" size="sm"><Link href="/cases">View Cases <ArrowRight /></Link></Button></div>
    </div>
  </>;
}
