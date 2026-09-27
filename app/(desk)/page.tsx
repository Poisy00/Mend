import Link from "next/link";
import { ArrowRight, CalendarClock, Headset, PhoneForwarded, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MendShell } from "@/components/mend-shell";

export default function TodayPage() {
  return <MendShell currentArea="today">
    <div className="mend-enter">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
        <div><p className="mb-2 text-sm font-medium text-primary">YOUR WORKSPACE</p><h1 className="text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-[1.04] tracking-[-.055em]">Today, in order.</h1><p className="mt-3 max-w-xl text-base text-muted-foreground">Keep callbacks moving and prepare the next dispatch with a clear view of what needs attention.</p></div>
        <Button asChild size="lg"><Link href="/follow-ups/new"><Plus />New follow-up</Link></Button>
      </div>
      <div className="grid gap-0 border-b border-border lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.8fr)]">
        <section className="min-h-[410px] border-b border-border py-8 lg:border-b-0 lg:border-r lg:pr-9" aria-labelledby="queue-heading">
          <div className="mb-7 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">CALLBACK QUEUE</p><h2 id="queue-heading" className="mt-1 text-[23px] font-semibold tracking-[-.035em]">Follow-ups</h2></div><Link href="/follow-ups" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open queue <ArrowRight className="size-4" /></Link></div>
          <div className="grid min-h-[265px] place-items-center rounded-xl border border-dashed border-border bg-card/45 px-6 text-center"><div className="max-w-xs"><div className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary"><PhoneForwarded className="size-5" /></div><h3 className="mt-4 text-lg font-semibold">A clear queue starts here</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Create your first follow-up to see what is due, what can wait, and what is complete.</p><Button asChild variant="outline" className="mt-5"><Link href="/follow-ups/new">Add a follow-up</Link></Button></div></div>
        </section>
        <aside className="py-8 lg:pl-9" aria-label="Quick actions">
          <p className="text-sm font-medium text-muted-foreground">NEXT ACTION</p><h2 className="mt-1 text-[23px] font-semibold tracking-[-.035em]">Start with the right tool.</h2>
          <div className="mt-7 space-y-3">
            <Link href="/rcc" className="group flex min-h-[104px] items-center gap-4 rounded-xl border border-border bg-card px-5 transition-colors hover:border-primary/45 hover:bg-accent/30"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Headset className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">RCC Dispatch</strong><span className="mt-1 block text-sm text-muted-foreground">Prepare an expedite or follow-up draft.</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/schedule" className="group flex min-h-[104px] items-center gap-4 rounded-xl border border-border bg-card px-5 transition-colors hover:border-primary/45 hover:bg-accent/30"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><CalendarClock className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-[15px]">Your schedule</strong><span className="mt-1 block text-sm text-muted-foreground">Set your repeating work week and pauses.</span></span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-6 text-sm"><span className="text-muted-foreground">Cases are saved only when you choose to save them.</span><Link href="/cases" className="font-medium text-primary hover:underline">View Cases <ArrowRight className="inline size-4" /></Link></div>
    </div>
  </MendShell>;
}
