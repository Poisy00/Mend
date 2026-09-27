
import { ArrowRight, CalendarClock, Headset, PhoneForwarded, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MendShell } from "@/components/mend-shell";
import { getPageSession } from "@/lib/server/page-auth";
import { listFollowUps } from "@/lib/server/follow-ups";
import { getSchedule } from "@/lib/server/schedule";
import { activeShift } from "@/lib/schedule/rules";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";

export default async function TodayPage() {
  const session = await getPageSession();
  const now = new Date();
  const [followUps, schedule] = await Promise.all([
    listFollowUps(session!.id, { limit: 100 }),
    getSchedule(session!.id),
  ]);
  const next = followUps.items.filter(item => classifyFollowUp(item, now.getTime()) !== "completed").sort((a, b) => rankFollowUp(b, now.getTime()) - rankFollowUp(a, now.getTime())).slice(0, 4);
  const shift = activeShift(schedule.week, schedule.exceptions, now);
  return <MendShell currentArea="today">
    <div className="mend-enter">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
        <div><p className="mb-2 text-sm font-medium text-primary">YOUR WORKSPACE</p><h1 className="text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-[1.04] tracking-[-.055em]">Today, in order.</h1><p className="mt-3 max-w-xl text-base text-muted-foreground">Keep callbacks moving and prepare the next dispatch with a clear view of what needs attention.</p></div>
        <Button asChild size="lg"><a href="/follow-ups/new"><Plus />New follow-up</a></Button>
      </div>
      <div className="grid gap-0 border-b border-border lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]">
        <section className="min-h-[410px] border-b border-border py-8 lg:border-b-0 lg:border-r lg:pr-9" aria-labelledby="queue-heading">
          <div className="mb-7 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">CALLBACK QUEUE</p><h2 id="queue-heading" className="mt-1 text-[23px] font-semibold tracking-[-.035em]">Follow-ups</h2></div><a href="/follow-ups" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open queue <ArrowRight className="size-4" /></a></div>
          {next.length ? <div className="divide-y divide-border border-y border-border">{next.map(item => <a key={item.id} href="/follow-ups" className="flex items-center justify-between gap-4 py-5 hover:bg-accent/20"><span className="min-w-0"><strong className="block truncate text-[15px]">{item.customerName}</strong><span className="mt-1 block truncate text-sm text-muted-foreground">{item.reason}</span></span><span className="shrink-0 text-right text-sm"><strong className="block capitalize">{classifyFollowUp(item, now.getTime())}</strong><span className="mt-1 block text-xs text-muted-foreground">{new Date(item.dueAt).toLocaleString("en-US", { timeZone: item.sourceTimezone, dateStyle: "medium", timeStyle: "short" })}</span></span></a>)}</div> : <div className="grid min-h-[265px] place-items-center rounded-xl border border-dashed border-border bg-card/45 px-6 text-center"><div className="max-w-xs"><div className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary"><PhoneForwarded className="size-5" /></div><h3 className="mt-4 text-lg font-semibold">A clear queue starts here</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Create your first follow-up to see what is due, what can wait, and what is complete.</p></div></div>}
        </section>
        <aside className="py-8 lg:pl-9" aria-label="Quick actions">
          <p className="text-sm font-medium text-muted-foreground">NEXT ACTION</p><h2 className="mt-1 text-[23px] font-semibold tracking-[-.035em]">Start with the right tool.</h2>
          <div className="mt-7 space-y-3">
            <a href="/rcc" className="group flex min-h-[104px] items-center gap-4 rounded-xl border border-border bg-card px-5 transition-colors hover:border-primary/45 hover:bg-accent/30"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Headset className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">RCC Dispatch</strong><span className="mt-1 block text-sm text-muted-foreground">Prepare an expedite or follow-up draft.</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></a>
            <a href="/schedule" className="group flex min-h-[104px] items-center gap-4 rounded-xl border border-border bg-card px-5 transition-colors hover:border-primary/45 hover:bg-accent/30"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><CalendarClock className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">Your schedule</strong><span className="mt-1 block text-sm text-muted-foreground">{shift.working ? shift.onPause ? "On a scheduled pause" : "On shift now" : "Outside your scheduled shift"}</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></a>
          </div>
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-6 text-sm"><span className="text-muted-foreground">Cases are saved only when you choose to save them.</span><a href="/cases" className="font-medium text-primary hover:underline">View Cases <ArrowRight className="inline size-4" /></a></div>
    </div>
  </MendShell>;
}
