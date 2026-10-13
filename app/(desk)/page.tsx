import { Plus } from "lucide-react";
import { MendLink as Link } from "@/components/mend-link";
import { TodayQueue } from "@/components/today/queue";
import { Button } from "@/components/ui/button";
import { cairoDateLabel, focusHeadline } from "@/components/focus-line/headline";
import { Eyebrow } from "@/components/ui/page-header";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";
import { requirePageSession } from "@/lib/server/page-auth";
import { listFollowUps } from "@/lib/server/follow-ups";

export default async function TodayPage() {
  const session = await requirePageSession();
  const nowMs = new Date().getTime();
  const followUps = await listFollowUps(session.id, { limit: 100 });
  const open = followUps.items.filter(item => classifyFollowUp(item, nowMs) !== "completed").sort((a, b) => rankFollowUp(b, nowMs) - rankFollowUp(a, nowMs));
  const count = (bucket: string) => open.filter(item => classifyFollowUp(item, nowMs) === bucket).length;
  const overdue = count("overdue"), due = count("now"), soon = count("soon");
  const eyebrow = cairoDateLabel(nowMs);
  const { headline, description } = focusHeadline({ overdue, due, soon, open: open.length });
  return <>
    <div className="border-b border-border pb-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className={overdue ? "t-title mt-2 text-status-overdue" : "t-title mt-2"}>{headline}</h1>
          {description && <p className="t-body-lg mt-2 max-w-[60ch] text-text-secondary">{description}</p>}
        </div>
        <div className="flex items-center gap-2"><Button asChild><Link href="/follow-ups/new"><Plus />New follow-up</Link></Button></div>
      </div>
    </div>
    <section className="min-w-0 pt-8 pb-8" aria-label="Follow-ups">
      <TodayQueue items={open} now={nowMs} />
      {followUps.nextCursor && <div className="pt-4"><Button asChild variant="ghost" size="sm"><Link href="/follow-ups">View all in Follow-ups</Link></Button></div>}
    </section>
  </>;
}
