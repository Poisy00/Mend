"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSlidingIndicator } from "@/components/ui/sliding-indicator";
import { FocusDetail } from "@/components/today/focus-detail";
import { useMobileDetail } from "@/components/use-mobile-detail";
import { NewFollowUpTrigger } from "@/components/follow-ups/new-follow-up-dialog";
import { Kbd } from "@/components/ui/kbd";
import { useFollowUpActions } from "@/components/focus-line/actions";
import { FadeSwap } from "@/components/focus-line/fade";
import { FilterTabs, type FilterTab } from "@/components/focus-line/filter-tabs";
import { LineActions, LineDay, LineIndicator, LineNow, LineRow, spineEnds, type LineNode } from "@/components/focus-line/line";
import { buildLineEntries, byDue, cairoFormat, gutterTime } from "@/components/focus-line/timeline";
import { formatAccountIfComplete } from "@/lib/display/format";
import { followUpDisplay, type QueueGroup } from "@/lib/follow-ups/display";
import { classifyFollowUp } from "@/lib/follow-ups/rules";
import type { FollowUp } from "@/lib/follow-ups/types";

type Filter = "all" | QueueGroup;

const tabs: FilterTab<Filter>[] = [
  { key: "all", label: "All", tone: "neutral" },
  { key: "overdue", label: "Late", tone: "overdue" },
  { key: "now", label: "Due now", tone: "due" },
  { key: "soon", label: "Soon", tone: "accent" },
  { key: "waiting", label: "Later", tone: "neutral" },
];

export function TodayQueue({ items: initialItems, now: serverNow }: { items: FollowUp[]; now: number }) {
  const mobile = useMobileDetail();
  const [items, setItems] = useState(initialItems);
  const [now, setNow] = useState(serverNow);
  const signature = initialItems.map(item => `${item.id}:${item.revision}`).join();
  const [seen, setSeen] = useState(signature);
  const [seenNow, setSeenNow] = useState(serverNow);
  if (seen !== signature) { setSeen(signature); setItems(initialItems); }
  if (seenNow !== serverNow) { setSeenNow(serverNow); setNow(serverNow); }
  const [filter, setFilter] = useState<Filter>("all");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = [...initialItems].sort(byDue);
    return (first.find(item => ["overdue", "now"].includes(classifyFollowUp(item, serverNow))) ?? first[0])?.id ?? null;
  });
  const selectedIndex = useRef(0);
  const orderedRef = useRef<FollowUp[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  useSlidingIndicator(listRef, mobile ? null : selectedId);
  const { resolve, snooze, finish, mendedId, leavingId } = useFollowUpActions({
    onResolved: item => {
      // Pick the neighbour in the same update that removes the row, so the detail panel never goes empty for a commit.
      const list = orderedRef.current;
      const index = list.findIndex(entry => entry.id === item.id);
      const next = list[index + 1] ?? list[index - 1];
      setItems(current => current.filter(entry => entry.id !== item.id));
      setSelectedId(current => current === item.id ? next?.id ?? null : current);
    },
    onSnoozed: updated => setItems(current => current.map(entry => entry.id === updated.id ? updated : entry)),
  });

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);

  const ordered = useMemo(() => [...items].sort(byDue), [items]);
  useEffect(() => { orderedRef.current = ordered; });
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
    <NewFollowUpTrigger variant="secondary" className="mt-5">New follow-up</NewFollowUpTrigger>
  </div>;

  const nowClock = cairoFormat({ hour: "numeric", minute: "2-digit" }, now);
  const entries = buildLineEntries(visible, now, filter === "all");

  const line = <div>
    <FilterTabs label="Filter follow-ups" className="mb-4" tabs={tabs.map(tab => ({ ...tab, count: counts[tab.key] }))} value={filter} onChange={selectFilter} />
    <FadeSwap swapKey={filter}>{entries.length ? <ul ref={listRef} data-indicator-host="" className="relative"><LineIndicator />
      {entries.map((entry, index) => {
        const ends = spineEnds(index === 0, index === entries.length - 1);
        if (entry.kind === "now") return <LineNow key="now" clock={nowClock} ends={ends} />;
        if (entry.kind === "day") return <LineDay key={`day-${entry.label}`} label={entry.label} ends={ends} />;
        const { item } = entry;
        const display = followUpDisplay(item, now);
        const bucket = classifyFollowUp(item, now) as QueueGroup;
        const name = item.customerName || item.accountNumber;
        return <LineRow key={item.id} id={item.id} ends={ends} gutter={gutterTime(item.dueAt, item.sourceTimezone)} node={bucket as LineNode} name={name}
          ident={item.caseNumber || formatAccountIfComplete(item.accountNumber)} subtitle={item.reason} label={display.label} labelTone={bucket === "overdue" ? "overdue" : bucket === "now" ? "now" : undefined}
          selected={!mobile && selectedId === item.id} href={mobile ? `/follow-ups?selected=${item.id}` : undefined} onSelect={() => setSelectedId(item.id)}
          mended={mendedId === item.id} leaving={leavingId === item.id} onStitchEnd={() => finish(item.id)}
          actions={<LineActions name={name} onResolve={() => void resolve(item)} onSnooze={minutes => void snooze(item, minutes)} />} />;
      })}
    </ul> : <p className="t-meta py-12 text-center text-text-secondary">Nothing in this filter.</p>}</FadeSwap>
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
