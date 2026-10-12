import { ArrowRight, Plus, PhoneOutgoing, Wrench, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { MendLink as Link } from "@/components/mend-link";
import { QueueSummary } from "@/components/follow-ups/queue-summary";
import { ShiftBlock } from "@/components/today/shift-block";
import { TodayQueue } from "@/components/today/queue";
import { Button } from "@/components/ui/button";
import { Eyebrow, PageHeader } from "@/components/ui/page-header";
import { displayName } from "@/lib/display/format";
import { relativeTime } from "@/lib/display/relative";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";
import { requirePageSession } from "@/lib/server/page-auth";
import { listCases } from "@/lib/server/cases";
import { listFollowUps } from "@/lib/server/follow-ups";
import { getSchedule } from "@/lib/server/schedule";

const rccTools = [
  { href: "/rcc?tool=expedite", label: "Appointment expedite", icon: Zap },
  { href: "/rcc?tool=technician-review", label: "Technician review", icon: Wrench },
  { href: "/rcc?tool=quick-follow-up", label: "Quick follow-up", icon: PhoneOutgoing },
];

function RailBlock({ eyebrow, href, link, children }: { eyebrow: string; href: string; link: string; children: ReactNode }) {
  return <section className="border-b border-border py-6 first:pt-0 last:border-0" aria-label={eyebrow}>
    <div className="mb-3 flex items-center justify-between gap-2"><Eyebrow>{eyebrow}</Eyebrow><Button asChild variant="ghost" size="sm" className="-mr-2"><Link href={href}>{link} <ArrowRight className="size-3.5" /></Link></Button></div>
    {children}
  </section>;
}

export default async function TodayPage() {
  const session = await requirePageSession();
  const nowMs = new Date().getTime();
  const [followUps, schedule, cases] = await Promise.all([
    listFollowUps(session.id, { limit: 100 }),
    getSchedule(session.id),
    listCases(session.id, { limit: 3 }),
  ]);
  const open = followUps.items.filter(item => classifyFollowUp(item, nowMs) !== "completed").sort((a, b) => rankFollowUp(b, nowMs) - rankFollowUp(a, nowMs));
  const shown = open.slice(0, 8);
  const count = (bucket: string) => open.filter(item => classifyFollowUp(item, nowMs) === bucket).length;
  const counts = { overdue: count("overdue"), now: count("now"), soon: count("soon"), waiting: count("waiting") };
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "long", month: "long", day: "numeric" }).formatToParts(nowMs);
  const part = (type: string) => date.find(entry => entry.type === type)?.value ?? "";
  const eyebrow = `${part("weekday")} · ${part("month")} ${part("day")}`;
  return <>
    <div className="border-b border-border pb-8"><PageHeader eyebrow={eyebrow} title="Today, in order." description={<QueueSummary counts={counts} />} actions={<Button asChild><Link href="/follow-ups/new"><Plus />New follow-up</Link></Button>} /></div>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 pt-8 pb-8 lg:pr-8" aria-labelledby="queue-heading">
        <div className="flex items-center justify-between gap-3"><h2 id="queue-heading" className="t-heading">Follow-ups</h2><Button asChild variant="ghost" size="sm"><Link href="/follow-ups">Open queue <ArrowRight /></Link></Button></div>
        <TodayQueue key={shown.map(item => `${item.id}:${item.revision}`).join()} items={shown} now={nowMs} total={open.length} />
      </section>
      <aside className="border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pl-8" aria-label="Shift, dispatch and cases">
        <RailBlock eyebrow="Shift" href="/schedule" link="Schedule"><ShiftBlock week={schedule.week} exceptions={schedule.exceptions} now={nowMs} /></RailBlock>
        <RailBlock eyebrow="RCC Dispatch" href="/rcc" link="Open">
          <ul className="-mx-2">{rccTools.map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} className="t-label flex h-10 items-center gap-2.5 rounded-[8px] px-2 outline-none transition-colors duration-[var(--dur-quick)] hover-fine:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring"><Icon aria-hidden="true" strokeWidth={1.75} className="size-4 text-text-secondary" />{label}<ArrowRight aria-hidden="true" className="ml-auto size-3.5 text-text-muted" /></Link></li>)}</ul>
        </RailBlock>
        <RailBlock eyebrow="Cases" href="/cases" link="View all">
          {cases.items.length
            ? <ul className="-mx-2">{cases.items.map(item => <li key={item.id}><Link href={`/cases?selected=${item.id}`} className="flex min-h-10 flex-col justify-center rounded-[8px] px-2 py-1.5 outline-none transition-colors duration-[var(--dur-quick)] hover-fine:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring"><span className="flex min-w-0 items-baseline gap-2"><span className="t-label truncate">{displayName(item.customerName) || item.summary}</span><span className="t-id shrink-0 text-text-muted">{item.humanId}</span></span><span className="t-caption num text-text-secondary">{relativeTime(item.updatedAt, nowMs)}</span></Link></li>)}</ul>
            : <p className="t-meta text-text-secondary">Cases are saved only when you choose to save them.</p>}
        </RailBlock>
      </aside>
    </div>
  </>;
}
