"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Check } from "lucide-react";
import { toast } from "sonner";
import { MendLink as Link } from "@/components/mend-link";
import { FocusDetail, clockTime, snoozeOptions } from "@/components/today/focus-detail";
import { useMobileDetail } from "@/components/use-mobile-detail";
import { refreshQueueCounts } from "@/components/use-queue-counts";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { displayName, formatAccountIfComplete } from "@/lib/display/format";
import { followUpDisplay, type QueueGroup } from "@/lib/follow-ups/display";
import { classifyFollowUp } from "@/lib/follow-ups/rules";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { cn } from "@/lib/utils";

type Filter = "all" | QueueGroup;
type Entry = { kind: "item"; item: FollowUp } | { kind: "now" } | { kind: "day"; label: string };

const filters: { key: Filter; label: string; chip: string }[] = [
  { key: "all", label: "All", chip: "bg-surface-hover text-text-secondary" },
  { key: "overdue", label: "Late", chip: "bg-status-overdue-tint text-status-overdue" },
  { key: "now", label: "Due now", chip: "bg-status-due-tint text-status-due" },
  { key: "soon", label: "Soon", chip: "bg-accent text-primary" },
  { key: "waiting", label: "Later", chip: "bg-surface-hover text-text-secondary" },
];
const nodeTone: Record<QueueGroup, string> = {
  overdue: "bg-status-overdue shadow-[0_0_0_3px_var(--status-overdue-tint)]",
  now: "bg-status-due shadow-[0_0_0_3px_var(--status-due-tint)]",
  soon: "bg-sheet shadow-[0_0_0_2px_var(--primary)]",
  waiting: "bg-sheet shadow-[0_0_0_2px_var(--text-muted)]",
};
const actionButton = "relative bg-sheet shadow-chip before:absolute before:-inset-1 hover-fine:bg-surface-hover";
const spine = "relative self-stretch grid place-items-center before:absolute before:left-1/2 before:w-0.5 before:-translate-x-px before:bg-border";
const spineEnds = (first: boolean, last: boolean) => cn(first ? "before:top-1/2" : "before:top-0", last ? "before:bottom-1/2" : "before:bottom-0");
const rowClass = "relative grid w-full min-h-[68px] grid-cols-[68px_22px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[10px] pr-3 text-left outline-none transition-colors duration-[var(--dur-quick)] hover-fine:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const lineRow = "grid grid-cols-[68px_22px_minmax(0,1fr)] items-center gap-x-3";

const cairoDay = (ms: number) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(ms).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};
const cairoFormat = (options: Intl.DateTimeFormatOptions, ms: number) => new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", ...options }).format(ms);
function dayLabel(ms: number, nowMs: number) {
  const diff = cairoDay(ms) - cairoDay(nowMs);
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 6) return cairoFormat({ weekday: "short" }, ms);
  const sameYear = cairoFormat({ year: "numeric" }, ms) === cairoFormat({ year: "numeric" }, nowMs);
  return cairoFormat({ month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }, ms);
}
const byDue = (a: FollowUp, b: FollowUp) => Date.parse(a.dueAt) - Date.parse(b.dueAt);

export function TodayQueue({ items: initialItems, now: serverNow }: { items: FollowUp[]; now: number }) {
  const router = useRouter();
  const mobile = useMobileDetail();
  const [items, setItems] = useState(initialItems);
  const [now, setNow] = useState(serverNow);
  const signature = initialItems.map(item => `${item.id}:${item.revision}`).join();
  const [seen, setSeen] = useState(signature);
  const [seenNow, setSeenNow] = useState(serverNow);
  if (seen !== signature) { setSeen(signature); setItems(initialItems); }
  if (seenNow !== serverNow) { setSeenNow(serverNow); setNow(serverNow); }
  const [mendedId, setMendedId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = [...initialItems].sort(byDue);
    return (first.find(item => ["overdue", "now"].includes(classifyFollowUp(item, serverNow))) ?? first[0])?.id ?? null;
  });
  const finishing = useRef(new Set<string>());
  const selectedIndex = useRef(0);

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

  const ordered = useMemo(() => [...items].sort(byDue), [items]);
  const visible = filter === "all" ? ordered : ordered.filter(item => classifyFollowUp(item, now) === filter);
  const selected = items.find(item => item.id === selectedId) ?? null;
  const counts: Record<Filter, number> = { all: items.length, overdue: 0, now: 0, soon: 0, waiting: 0 };
  for (const item of items) { const bucket = classifyFollowUp(item, now); if (bucket !== "completed") counts[bucket]++; }

  function selectFilter(next: Filter) {
    setFilter(next);
    const list = next === "all" ? ordered : ordered.filter(item => classifyFollowUp(item, now) === next);
    if (list.length && !list.some(item => item.id === selectedId)) setSelectedId(list[0].id);
  }

  useEffect(() => {
    const index = ordered.findIndex(item => item.id === selectedId);
    if (index >= 0) { selectedIndex.current = index; return; }
    if (selectedId) setSelectedId(ordered[Math.min(selectedIndex.current, ordered.length - 1)]?.id ?? null);
  }, [ordered, selectedId]);

  useEffect(() => {
    if (mobile) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[contenteditable]"))) return;
      if (document.querySelector('[role="dialog"],[role="menu"]')) return;
      const key = event.key.toLowerCase();
      const move = (step: 1 | -1) => {
        event.preventDefault();
        const index = visible.findIndex(item => item.id === selectedId);
        const next = visible[Math.max(0, Math.min(visible.length - 1, index + step))];
        if (!next) return;
        setSelectedId(next.id);
        document.querySelector(`[data-row-id="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: "nearest" });
      };
      if (key === "j" || key === "arrowdown") move(1);
      else if (key === "k" || key === "arrowup") move(-1);
      else if (key === "e" && selected && mendedId !== selected.id) { event.preventDefault(); void resolve(selected); }
      else if (key === "s" && selected) { event.preventDefault(); setSnoozeOpen(true); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!items.length) return <div className="py-16 text-center">
    <h3 className="t-heading">Queue clear.</h3>
    <p className="t-meta mt-1 text-text-secondary">New follow-ups show up here at the time they&apos;re due.</p>
    <Button asChild variant="secondary" className="mt-5"><Link href="/follow-ups/new">New follow-up</Link></Button>
  </div>;

  const today = cairoDay(now);
  const nowClock = cairoFormat({ hour: "numeric", minute: "2-digit" }, now);
  const entries: Entry[] = [];
  let previousDay = today;
  let dividerShown = false;
  let nowPlaced = filter !== "all" || !visible.some(item => cairoDay(Date.parse(item.dueAt)) === today);
  for (const item of visible) {
    const due = Date.parse(item.dueAt);
    if (!nowPlaced && due >= now) { entries.push({ kind: "now" }); nowPlaced = true; }
    const day = cairoDay(due);
    if (day !== today && day !== previousDay) { entries.push({ kind: "day", label: dayLabel(due, now) }); dividerShown = true; }
    else if (day === today && previousDay !== today && dividerShown) entries.push({ kind: "day", label: "Today" });
    previousDay = day;
    entries.push({ kind: "item", item });
  }
  if (!nowPlaced) entries.push({ kind: "now" });

  const line = <div>
    <div role="group" aria-label="Filter follow-ups" className="mb-4 flex w-max max-w-full gap-1 overflow-x-auto rounded-[12px] bg-desk p-1">
      {filters.map(({ key, label, chip }) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => selectFilter(key)}
        className={cn("t-label inline-flex h-8 shrink-0 items-center gap-2 rounded-[9px] px-3 whitespace-nowrap outline-none transition-colors duration-[var(--dur-quick)] focus-visible:outline-2 focus-visible:outline-ring", filter === key ? "bg-sheet shadow-chip text-foreground" : "text-text-secondary")}>
        {label}<span className={cn("t-caption num inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 !font-semibold", chip)}>{counts[key]}</span>
      </button>)}
    </div>
    {entries.length ? <ul>
      {entries.map((entry, index) => {
        const ends = spineEnds(index === 0, index === entries.length - 1);
        if (entry.kind === "now") return <li key="now" aria-label={`Now ${nowClock}`} className={cn(lineRow, "h-7")}>
          <span className="t-meta num text-right font-semibold text-primary">{nowClock}</span>
          <span className={cn(spine, ends)}><span className="relative size-3 rounded-full bg-primary shadow-[0_0_0_4px_var(--accent)]" /></span>
          <span className="relative h-0.5 rounded-full bg-primary"><span className="t-caption absolute -top-2.5 right-0 bg-sheet pl-2 font-semibold text-primary">Now</span></span>
        </li>;
        if (entry.kind === "day") return <li key={`day-${entry.label}`} className={cn(lineRow, "h-11")}>
          <span />
          <span className={cn(spine, ends)}><span className="relative h-0.5 w-2 bg-text-muted" /></span>
          <span className="t-meta font-semibold text-text-secondary">{entry.label}</span>
        </li>;
        const { item } = entry;
        const display = followUpDisplay(item, now);
        const bucket = classifyFollowUp(item, now) as QueueGroup;
        const name = item.customerName || item.accountNumber;
        const isSelected = !mobile && selectedId === item.id;
        const className = cn(rowClass, isSelected && "bg-accent hover-fine:bg-accent", "[@media(hover:none)]:pb-14");
        const children = <>
          <span className="t-meta num text-right text-text-secondary">{new Intl.DateTimeFormat("en-US", { timeZone: item.sourceTimezone, hour: "numeric", minute: "2-digit" }).format(Date.parse(item.dueAt))}</span>
          <span className={cn(spine, ends)}><span className={cn("relative size-2.5 rounded-full", nodeTone[bucket])} /></span>
          <span className="min-w-0 py-2">
            <span className="flex min-w-0 items-baseline gap-2">
              <strong onAnimationEnd={event => { if (event.animationName === "mend-stitch") finish(item.id); }} className={cn("t-label truncate !text-[15px] !font-semibold text-text-primary", mendedId === item.id && "mend-stitch")}>{displayName(name)}</strong>
              <span className="t-id shrink-0 text-text-muted">{item.caseNumber || formatAccountIfComplete(item.accountNumber)}</span>
            </span>
            <span className="t-meta block truncate text-text-secondary">{item.reason}</span>
          </span>
          <span className={cn("t-meta num whitespace-nowrap text-text-secondary transition-opacity duration-[var(--dur-quick)] group-hover/actions:opacity-0 group-focus-within/actions:opacity-0 group-has-[[data-state=open]]/actions:opacity-0 [@media(hover:none)]:opacity-100", bucket === "overdue" && "!font-semibold text-status-overdue", bucket === "now" && "!font-semibold text-status-due")}>{display.label}</span>
        </>;
        return <li key={item.id} data-leaving={leavingId === item.id || undefined} className={cn("grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none", leavingId === item.id && "grid-rows-[0fr] opacity-0")}>
          <div className={cn("group/actions relative min-h-0", leavingId === item.id && "overflow-hidden")}>
            {mobile
              ? <Link href={`/follow-ups?selected=${item.id}`} data-row-id={item.id} className={className}>{children}</Link>
              : <button type="button" data-row-id={item.id} onClick={() => setSelectedId(item.id)} aria-current={isSelected ? "true" : undefined} className={className}>{children}</button>}
            <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover/actions:opacity-100 group-focus-within/actions:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:top-auto [@media(hover:none)]:bottom-2.5 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className={actionButton} aria-label={`Mark ${name} resolved`} onClick={() => void resolve(item)}><Check /></Button></TooltipTrigger><TooltipContent>Mark resolved</TooltipContent></Tooltip>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className={actionButton} aria-label={`Snooze ${name}`}><AlarmClock /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">{snoozeOptions.map(option => <DropdownMenuItem key={option.minutes} onSelect={() => void snooze(item, option.minutes)}>{option.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
            </div>
          </div>
        </li>;
      })}
    </ul> : <p className="t-meta py-12 text-center text-text-secondary">Nothing in this filter.</p>}
    {!mobile && <p className="t-caption mt-4 hidden items-center gap-4 text-text-muted [@media(hover:hover)_and_(pointer:fine)]:flex">
      <span className="inline-flex items-center gap-1.5"><Kbd keys={["J"]} /><Kbd keys={["K"]} />Move</span>
      <span className="inline-flex items-center gap-1.5"><Kbd keys={["E"]} />Resolve</span>
      <span className="inline-flex items-center gap-1.5"><Kbd keys={["S"]} />Snooze</span>
    </p>}
  </div>;

  if (mobile) return line;
  return <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-10">
    {line}
    {selected && <div className="sticky top-6">
      <FocusDetail item={selected} now={now} mended={mendedId === selected.id} onResolve={() => void resolve(selected)} onSnooze={minutes => void snooze(selected, minutes)} snoozeOpen={snoozeOpen} onSnoozeOpenChange={setSnoozeOpen} />
    </div>}
  </div>;
}
