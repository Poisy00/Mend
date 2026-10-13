"use client";

import { useEffect, useState } from "react";
import { AlarmClock, Check, PanelRightOpen } from "lucide-react";
import { clockTime, snoozeOptions } from "@/components/focus-line/actions";
import { MendLink as Link } from "@/components/mend-link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { StatusPill } from "@/components/ui/status";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { displayName, formatAccountIfComplete, formatPhone } from "@/lib/display/format";
import { relativeTime } from "@/lib/display/relative";
import { dueCaption, followUpDisplay } from "@/lib/follow-ups/display";
import type { FollowUp } from "@/lib/follow-ups/types";
import { cn } from "@/lib/utils";

type HistoryEvent = { id: string; type: string; createdAt: string };

export function FocusDetail({ item, now, onResolve, onSnooze, snoozeOpen, onSnoozeOpenChange, mended }: {
  item: FollowUp; now: number; onResolve: () => void; onSnooze: (minutes: number) => void;
  snoozeOpen: boolean; onSnoozeOpenChange: (open: boolean) => void; mended: boolean;
}) {
  const [history, setHistory] = useState<{ id: string; events: HistoryEvent[] } | null>(null);
  const display = followUpDisplay(item, now);
  const phone = item.phoneNumber.replace(/\D/g, "").length === 10 ? formatPhone(item.phoneNumber) : item.phoneNumber;
  const account = formatAccountIfComplete(item.accountNumber);

  useEffect(() => {
    let active = true;
    fetch(`/api/follow-ups/${item.id}`).then(response => response.json() as Promise<{ history?: HistoryEvent[] }>).then(data => {
      if (active && Array.isArray(data.history)) setHistory({ id: item.id, events: data.history });
    }).catch(() => {});
    return () => { active = false; };
  }, [item.id, item.revision]);

  return <aside aria-label="Selected follow-up" className="mend-pane rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border),0_12px_32px_-20px_rgb(0_0_0/.18)]">
    <StatusPill tone={display.tone}>{display.label}</StatusPill>
    <h2 className={cn("mt-3 text-[24px] leading-[1.2] font-semibold tracking-[-0.02em]", mended && "mend-stitch")}>{displayName(item.customerName)}</h2>
    <p className="t-body-lg mt-1.5 text-text-secondary">{item.reason}</p>
    <div className="mt-5 flex items-center justify-between rounded-[12px] bg-desk px-4 py-3.5">
      <div><p className="t-caption text-text-secondary">Callback number</p><p className="num text-[24px] leading-8 font-semibold">{phone}</p></div>
      <CopyButton value={phone} label="phone number" />
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
      <div><dt className="t-caption text-text-secondary">Account</dt><dd className="t-label flex items-center gap-1"><span className="num">{account}</span><CopyButton value={account} label="account number" /></dd></div>
      <div><dt className="t-caption text-text-secondary">Case</dt><dd className="t-label">{item.caseNumber || "Not saved"}</dd></div>
      <div><dt className="t-caption text-text-secondary">Due</dt><dd className="t-label num">{dueCaption(item, now)}</dd></div>
      <div><dt className="t-caption text-text-secondary">Attempts</dt><dd className="t-label num">{item.attemptCount}</dd></div>
    </dl>
    {item.notes && <p className="t-meta mt-4 line-clamp-3 border-t border-border pt-4 text-text-secondary"><span className="font-semibold text-foreground">Last note.</span> {item.notes}</p>}
    <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
      <Button onClick={onResolve}><Check />Resolved<Kbd keys={["E"]} className="[@media(hover:none)]:hidden" /></Button>
      <DropdownMenu open={snoozeOpen} onOpenChange={onSnoozeOpenChange}>
        <DropdownMenuTrigger asChild><Button variant="secondary"><AlarmClock />Snooze<Kbd keys={["S"]} className="[@media(hover:none)]:hidden" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">{snoozeOptions.map(option => <DropdownMenuItem key={option.minutes} onSelect={() => onSnooze(option.minutes)}>{option.label}<span className="num ml-auto pl-4 text-text-muted">{clockTime(now + option.minutes * 60_000)}</span></DropdownMenuItem>)}</DropdownMenuContent>
      </DropdownMenu>
      <Tooltip><TooltipTrigger asChild><Button asChild variant="secondary" size="icon"><Link href={`/follow-ups?selected=${item.id}`} aria-label="Open full follow-up"><PanelRightOpen /></Link></Button></TooltipTrigger><TooltipContent>Open full follow-up</TooltipContent></Tooltip>
    </div>
    <section className="mt-6" aria-label="History">
      <h3 className="t-caption font-semibold text-text-secondary">History</h3>
      {history?.id === item.id && (history.events.length
        ? <ul className="mt-2">{history.events.slice(0, 3).map(event => <li key={event.id} className="t-meta grid grid-cols-[80px_1fr] gap-3 py-1.5"><span className="num whitespace-nowrap text-text-muted">{relativeTime(event.createdAt, now)}</span><span>{event.type.charAt(0).toUpperCase()}{event.type.replaceAll("_", " ").slice(1)}</span></li>)}</ul>
        : <p className="t-meta mt-2 text-text-secondary">No history yet.</p>)}
    </section>
  </aside>;
}
