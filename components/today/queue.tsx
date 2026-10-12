"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { MendLink as Link } from "@/components/mend-link";
import { refreshQueueCounts } from "@/components/use-queue-counts";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GroupLabel, WorkRow } from "@/components/ui/work-row";
import { formatAccountIfComplete } from "@/lib/display/format";
import { dueCaption, followUpDisplay, queueGroupLabel, type QueueGroup } from "@/lib/follow-ups/display";
import { classifyFollowUp } from "@/lib/follow-ups/rules";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { cn } from "@/lib/utils";

const groupOrder: QueueGroup[] = ["overdue", "now", "soon", "waiting"];
const groupTone: Record<QueueGroup, string> = { overdue: "text-status-overdue", now: "text-status-due", soon: "text-foreground", waiting: "text-text-secondary" };
const snoozeOptions = [{ label: "30 minutes", minutes: 30 }, { label: "1 hour", minutes: 60 }, { label: "2 hours", minutes: 120 }];
const actionButton = "relative bg-sheet shadow-chip before:absolute before:-inset-1 hover-fine:bg-surface-hover";
const clockTime = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function TodayQueue({ items: initialItems, now: serverNow, total }: { items: FollowUp[]; now: number; total: number }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [now, setNow] = useState(serverNow);
  const [mendedId, setMendedId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const finishing = useRef(new Set<string>());

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);

  async function send(item: FollowUp, command: FollowUpCommand): Promise<FollowUp | null> {
    try {
      const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, command }) });
      const data = await response.json() as { item?: FollowUp };
      if (response.ok && data.item) return data.item;
      toast.error(response.status === 409 ? "Unable to update this follow-up. It changed elsewhere — refreshed." : "Unable to update this follow-up.");
    } catch {
      toast.error("Unable to update this follow-up.");
    }
    router.refresh();
    return null;
  }

  async function undo(item: FollowUp, command: FollowUpCommand, message: string) {
    const restored = await send(item, command);
    if (!restored) return;
    toast.success(message);
    void refreshQueueCounts();
    router.refresh();
  }

  async function resolve(item: FollowUp) {
    const updated = await send(item, { type: "resolved" });
    if (!updated) return;
    setMendedId(item.id);
    window.setTimeout(() => finish(item.id), 1500);
    void refreshQueueCounts();
    toast.success("Marked resolved.", { duration: 5000, action: { label: "Undo", onClick: () => void undo(updated, { type: "restore" }, "Follow-up restored.") } });
  }

  // The stitch plays first, then the row collapses and the list re-groups.
  function finish(id: string) {
    if (finishing.current.has(id)) return;
    finishing.current.add(id);
    setLeavingId(id);
    window.setTimeout(() => {
      setItems(current => current.filter(entry => entry.id !== id));
      setMendedId(null);
      setLeavingId(null);
      router.refresh();
    }, 220);
  }

  async function snooze(item: FollowUp, minutes: number) {
    const dueAt = new Date(new Date().getTime() + minutes * 60_000);
    const updated = await send(item, { type: "reschedule", dueAt: dueAt.toISOString() });
    if (!updated) return;
    setItems(current => current.map(entry => entry.id === item.id ? updated : entry));
    void refreshQueueCounts();
    const restorable = Date.parse(item.dueAt) > new Date().getTime() + 2 * 60_000;
    toast.success(`Snoozed until ${clockTime(dueAt.getTime())}.`, { duration: 5000, ...(restorable ? { action: { label: "Undo", onClick: () => void undo(updated, { type: "reschedule", dueAt: item.dueAt }, "Snooze undone.") } } : {}) });
    router.refresh();
  }

  const grouped = groupOrder.map(group => ({ group, rows: items.filter(item => classifyFollowUp(item, now) === group) })).filter(entry => entry.rows.length);
  const remaining = total - items.length;

  if (!items.length) return <div className="py-16 text-center">
    <h3 className="t-heading">Your queue is clear.</h3>
    <p className="t-meta mt-1 text-text-secondary">New follow-ups appear here in the order they&apos;re due.</p>
    <Button asChild variant="secondary" className="mt-5"><Link href="/follow-ups/new">New follow-up</Link></Button>
  </div>;

  return <div className="-mx-3">
    {grouped.map(({ group, rows }, index) => <section key={group} aria-label={queueGroupLabel[group]}>
      <GroupLabel first={index === 0} count={rows.length} className={cn("px-3", groupTone[group])}>{queueGroupLabel[group]}</GroupLabel>
      {rows.map(item => {
        const display = followUpDisplay(item, now);
        const name = item.customerName || item.accountNumber;
        return <WorkRow key={item.id} href={`/follow-ups?selected=${item.id}`}
          title={name} subtitle={item.reason} id={item.caseNumber || formatAccountIfComplete(item.accountNumber)}
          meta={dueCaption(item, now)} metaLate={display.tone === "overdue"} tone={display.tone} statusLabel={display.label} left={display.left}
          mended={mendedId === item.id} leaving={leavingId === item.id} onMended={() => finish(item.id)}
          actions={<>
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className={actionButton} aria-label={`Mark ${name} resolved`} onClick={() => void resolve(item)}><Check /></Button></TooltipTrigger><TooltipContent>Mark resolved</TooltipContent></Tooltip>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className={actionButton} aria-label={`Snooze ${name}`}><AlarmClock /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">{snoozeOptions.map(option => <DropdownMenuItem key={option.minutes} onSelect={() => void snooze(item, option.minutes)}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
          </>} />;
      })}
    </section>)}
    {remaining > 0 && <div className="px-3 pt-4"><Button asChild variant="ghost" size="sm"><Link href="/follow-ups">View all {total} follow-ups <ArrowRight /></Link></Button></div>}
  </div>;
}
