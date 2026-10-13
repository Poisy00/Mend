"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";
import { followUpDisplay, type QueueGroup } from "@/lib/follow-ups/display";
import { formatAccountIfComplete } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { WorkRowSkeleton } from "@/components/workspace-skeleton";
import { refreshQueueCounts } from "@/components/use-queue-counts";
import { useMobileDetail } from "@/components/use-mobile-detail";
import { clockTime, useFollowUpActions } from "@/components/focus-line/actions";
import { useSlidingIndicator } from "@/components/ui/sliding-indicator";
import { FadeSwap } from "@/components/focus-line/fade";
import { FilterTabs, type FilterTab } from "@/components/focus-line/filter-tabs";
import { focusHeadline } from "@/components/focus-line/headline";
import { LineActions, LineDay, LineIndicator, LineNow, LineRow, spineEnds, type LineNode } from "@/components/focus-line/line";
import { buildLineEntries, byDue, cairoFormat, gutterTime } from "@/components/focus-line/timeline";
import { FollowUpDetail, outcomeOptions } from "./detail";
import { NewFollowUpTrigger } from "./new-follow-up-dialog";

type Page = { items: FollowUp[]; nextCursor: string | null };
type Filter = "all" | QueueGroup | "completed";

const tabs: FilterTab<Filter>[] = [
  { key: "all", label: "All", tone: "neutral" },
  { key: "overdue", label: "Late", tone: "overdue" },
  { key: "now", label: "Due now", tone: "due" },
  { key: "soon", label: "Soon", tone: "accent" },
  { key: "waiting", label: "Later", tone: "neutral" },
  { key: "completed", label: "Completed", tone: "done" },
];
const isClosed = (item: FollowUp) => ["completed", "abandoned", "cancelled"].includes(item.status);
const completedAt = (item: FollowUp) => Date.parse(item.completedAt ?? item.dueAt);

export function FollowUpQueue({ initialPage, initialSelected, now: serverNow }: { initialPage: Page; initialSelected?: FollowUp | null; now: number }) {
  const [items, setItems] = useState<FollowUp[]>(() => initialSelected && !initialPage.items.some(item => item.id === initialSelected.id) ? [initialSelected, ...initialPage.items] : initialPage.items);
  const [selected, setSelected] = useState<FollowUp | null>(() => {
    if (initialSelected) return initialSelected;
    const first = [...initialPage.items].sort((a, b) => rankFollowUp(b, serverNow) - rankFollowUp(a, serverNow)).find(item => ["overdue", "now"].includes(classifyFollowUp(item, serverNow)));
    return first ?? null;
  });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const isMobile = useMobileDetail();
  const [now, setNow] = useState(serverNow);
  const notified = useRef(new Set<string>());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const firstSearch = useRef(true);
  const scrolledToInitial = useRef(false);
  const visibleRef = useRef<FollowUp[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  const replace = useCallback((updated: FollowUp) => {
    setItems(current => current.some(entry => entry.id === updated.id) ? current.map(entry => entry.id === updated.id ? updated : entry) : [updated, ...current]);
    setSelected(current => current?.id === updated.id ? updated : current);
  }, []);
  const { resolve, snooze, finish, mendedId, leavingId } = useFollowUpActions({
    onResolved: updated => {
      // Move on to the next row so a run of E presses keeps flowing.
      const list = visibleRef.current;
      const index = list.findIndex(entry => entry.id === updated.id);
      const next = list[index + 1] ?? list[index - 1];
      replace(updated);
      if (index >= 0 && next) setSelected(next);
    },
    onSnoozed: replace,
    onRestored: replace,
    onFailed: () => { refresh().catch(() => toast.error("Unable to load follow-ups")); },
  });

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const url = useCallback((cursor?: string) => { const params = new URLSearchParams({ limit: "50" }); if (query) params.set("search", query); if (cursor) params.set("cursor", cursor); return `/api/follow-ups?${params}`; }, [query]);
  const refresh = useCallback(async () => { const response = await fetch(url()); if (!response.ok) throw new Error("Unable to load follow-ups"); const page = await response.json() as Page; setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); }, [url]);
  useEffect(() => { if (firstSearch.current) { firstSearch.current = false; return; } let active = true; fetch(url()).then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Page>; }).then(page => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); } }).catch(() => { if (active) { setLoading(false); toast.error("Unable to load follow-ups"); } }); return () => { active = false; }; }, [url]);

  const ordered = useMemo(() => [...items].sort(byDue), [items]);
  const open = useMemo(() => ordered.filter(item => classifyFollowUp(item, now) !== "completed"), [ordered, now]);
  const completed = useMemo(() => items.filter(item => classifyFollowUp(item, now) === "completed").sort((a, b) => completedAt(b) - completedAt(a)), [items, now]);
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: open.length, overdue: 0, now: 0, soon: 0, waiting: 0, completed: completed.length };
    for (const item of open) result[classifyFollowUp(item, now) as QueueGroup]++;
    return result;
  }, [open, completed, now]);
  const visible = filter === "completed" ? completed : filter === "all" ? open : open.filter(item => classifyFollowUp(item, now) === filter);
  useEffect(() => { visibleRef.current = visible; });
  const current = selected && (items.find(item => item.id === selected.id) ?? selected);
  useSlidingIndicator(listRef, isMobile ? null : current?.id ?? null);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!selected || scrolledToInitial.current) return; scrolledToInitial.current = true; document.querySelector(`[data-row-id="${CSS.escape(selected.id)}"]`)?.scrollIntoView({ block: "nearest" }); }, [selected]);
  useEffect(() => { if (!notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return; for (const item of items) { if (!["completed", "abandoned", "cancelled"].includes(item.status) && Date.parse(item.dueAt) <= now && !notified.current.has(item.id)) { new Notification("A Mend follow-up is due", { body: "Open your Follow-ups queue to review it." }); notified.current.add(item.id); } } }, [items, now, notificationsEnabled]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key !== "Escape") return; const target = event.target as HTMLElement | null; if (target?.closest("input,textarea,[role=dialog]")) return; setSelected(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  async function enableNotifications() { if (typeof Notification === "undefined") { toast.message("Browser alerts are unavailable. Due follow-ups stay visible here."); return; } try { const permission = await Notification.requestPermission(); setNotificationsEnabled(permission === "granted"); if (permission !== "granted") toast.message("Due follow-ups will still appear in this queue."); } catch { toast.message("Due follow-ups will still appear in this queue."); } }

  async function loadMore() { if (!nextCursor || loadingMore) return; setLoadingMore(true); try { const response = await fetch(url(nextCursor)); if (!response.ok) throw new Error("Unable to load more follow-ups"); const page = await response.json() as Page; setItems(current => [...current, ...page.items]); setNextCursor(page.nextCursor); setNow(Date.now()); } catch { toast.error("Unable to load more follow-ups"); } finally { setLoadingMore(false); } }
  async function act(item: FollowUp, command: FollowUpCommand) {
    if (command.type === "resolved") { await resolve(item); return; }
    const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, command }) });
    const data = await response.json() as { item?: FollowUp; error?: string };
    if (!response.ok || !data.item) { toast.error(response.status === 409 ? "Unable to update this follow-up. It changed elsewhere — refreshed." : `Unable to update this follow-up.${data.error ? " " + data.error : ""}`); await refresh(); return; }
    const rescheduled = ["busy", "no_answer", "follow_up", "escalation_required", "reschedule"].includes(command.type) && data.item.status !== "voicemail_required";
    toast.success(rescheduled ? `Rescheduled to ${clockTime(Date.parse(data.item.dueAt))}.` : command.type === "restore" ? "Follow-up restored." : "Follow-up updated.");
    setPickOpen(false);
    setSelected(data.item); await refresh(); void refreshQueueCounts();
  }
  async function saveProfile(item: FollowUp, profile: Record<string, unknown>) { const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, profile }) }); const data = await response.json() as { item?: FollowUp; error?: string }; if (!response.ok || !data.item) { toast.error(data.error ?? "Unable to save the follow-up profile."); await refresh(); return false; } setSelected(data.item); await refresh(); toast.success("Follow-up profile saved."); return true; }

  // A follow-up created from the dialog: refetch the list, select the new one, keep the queue counts current.
  function created(item?: FollowUp) {
    if (item) { setSelected(item); setMobileOpen(false); }
    refresh().catch(() => toast.error("Unable to load follow-ups"));
    void refreshQueueCounts();
  }
  function select(item: FollowUp) { if (item.id !== selected?.id) setPickOpen(false); setSelected(item); }
  function selectFilter(next: Filter) {
    setFilter(next);
    const list = next === "completed" ? completed : next === "all" ? open : open.filter(item => classifyFollowUp(item, now) === next);
    if (list.length && !list.some(item => item.id === selected?.id)) select(list[0]);
  }

  useEffect(() => {
    if (isMobile) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[contenteditable]"))) return;
      if (document.querySelector('[role="dialog"],[role="menu"]')) return;
      const key = event.key.toLowerCase();
      const move = (step: 1 | -1) => {
        event.preventDefault();
        const index = visible.findIndex(item => item.id === current?.id);
        const next = visible[Math.max(0, Math.min(visible.length - 1, index + step))];
        if (!next) return;
        select(next);
        document.querySelector(`[data-row-id="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: "nearest" });
      };
      const active = current && !isClosed(current) && mendedId !== current.id;
      if (key === "j" || key === "arrowdown") move(1);
      else if (key === "k" || key === "arrowup") move(-1);
      else if (key === "e" && current && active) { event.preventDefault(); void resolve(current); }
      else if (key === "s" && current && active) { event.preventDefault(); setSnoozeOpen(true); }
      else if (/^[1-6]$/.test(key) && current && active && current.status !== "voicemail_required") {
        event.preventDefault();
        const option = outcomeOptions[Number(key) - 1];
        if (option.command.type === "reschedule") setPickOpen(open => !open);
        else void act(current, option.command);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const header = focusHeadline({ overdue: counts.overdue, due: counts.now, soon: counts.soon, open: open.length }, "within the hour");
  const nowClock = cairoFormat({ hour: "numeric", minute: "2-digit" }, now);
  const entries = filter === "completed" ? visible.map(item => ({ kind: "item" as const, item })) : buildLineEntries(visible, now, filter === "all" && !query);
  const detailProps = { now, pickOpen, onPickOpenChange: setPickOpen, onAction: act, onSaveProfile: saveProfile };

  return <div>
    <PageHeader eyebrow="Callbacks" title="Follow-ups"
      description={<span role="status"><span className={header.late ? "text-status-overdue" : undefined}>{header.headline}</span>{header.description && ` ${header.description}`}</span>}
      actions={<>
        <label className="t-label flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[9px] px-2 text-text-secondary hover-fine:bg-surface-hover hover-fine:text-text-primary">
          <Switch checked={notificationsEnabled} onCheckedChange={checked => { if (checked) void enableNotifications(); else setNotificationsEnabled(false); }} aria-label="Browser reminders" />Browser reminders
        </label>
        <NewFollowUpTrigger onCreated={created} />
      </>} />
    <div className={cn("mt-8 grid items-start gap-10", !isMobile && current && "grid-cols-[minmax(0,1fr)_400px]")}>
      <section className="min-h-[500px] min-w-0" aria-label="Follow-ups">
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="relative min-w-[min(100%,220px)] flex-[0_1_300px]"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" /><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(event.target.value.trim() !== query); }} placeholder="Search your follow-ups" aria-label="Search your follow-ups" className="h-10 rounded-[10px] border-0 bg-secondary pl-9 shadow-none focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]" /></div>
          <FilterTabs label="Filter follow-ups" tabs={tabs.map(tab => ({ ...tab, count: counts[tab.key] }))} value={filter} onChange={selectFilter} />
          <p className="t-meta ml-auto text-text-secondary"><span className="num">{visible.length}{nextCursor ? "+" : ""}</span> {visible.length === 1 && !nextCursor ? "follow-up" : "follow-ups"}</p>
        </div>
        <FadeSwap swapKey={filter}>{loading ? <div className="py-4" aria-label="Loading follow-ups"><WorkRowSkeleton count={5} /></div>
          : items.length === 0 ? <div className="py-16 text-center"><h2 className="t-heading">{query ? "No matching follow-ups." : "No follow-ups here yet."}</h2><p className="t-meta mt-1 text-text-secondary">{query ? "Try a different name, account or case number." : "Create one to keep the next call in sight."}</p></div>
            : entries.length ? <ul ref={listRef} data-indicator-host="" className="relative"><LineIndicator />
              {entries.map((entry, index) => {
                const ends = spineEnds(index === 0, index === entries.length - 1);
                if (entry.kind === "now") return <LineNow key="now" clock={nowClock} ends={ends} />;
                if (entry.kind === "day") return <LineDay key={`day-${entry.label}`} label={entry.label} ends={ends} />;
                const { item } = entry;
                const done = isClosed(item);
                const display = followUpDisplay(item, now);
                const bucket = classifyFollowUp(item, now);
                const name = item.customerName || item.accountNumber;
                const isSelected = !isMobile && current?.id === item.id;
                return <LineRow key={item.id} id={item.id} ends={ends} gutter={done ? gutterTime(new Date(completedAt(item)).toISOString(), item.sourceTimezone) : gutterTime(item.dueAt, item.sourceTimezone)}
                  node={done ? "done" : bucket as LineNode} name={name} quiet={done}
                  tag={item.priority === "urgent" && !done ? <span className="t-caption shrink-0 rounded-full bg-status-overdue-tint px-1.5 !font-semibold text-status-overdue">Urgent</span> : undefined}
                  ident={item.caseNumber || formatAccountIfComplete(item.accountNumber)} subtitle={item.reason} label={display.label} labelTone={bucket === "overdue" ? "overdue" : bucket === "now" ? "now" : undefined}
                  selected={isSelected} onSelect={() => { select(item); setMobileOpen(isMobile); }}
                  mended={mendedId === item.id} leaving={leavingId === item.id} onStitchEnd={() => finish(item.id)}
                  actions={done ? undefined : <LineActions name={name} onResolve={() => void resolve(item)} onSnooze={minutes => void snooze(item, minutes)} snoozeOpen={isSelected ? snoozeOpen : undefined} onSnoozeOpenChange={isSelected ? setSnoozeOpen : undefined} />} />;
              })}
            </ul> : <p className="t-meta py-12 text-center text-text-secondary">{query ? "No matching follow-ups." : "Nothing in this filter."}</p>}</FadeSwap>
        {loadingMore && <WorkRowSkeleton count={2} />}
        {nextCursor && <Button variant="secondary" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more follow-ups"}</Button>}
        {!isMobile && <p className="t-caption mt-4 hidden flex-wrap items-center gap-x-4 gap-y-2 text-text-muted [@media(hover:hover)_and_(pointer:fine)]:flex">
          <span className="inline-flex items-center gap-1.5"><Kbd keys={["J"]} /><Kbd keys={["K"]} />Move</span>
          <span className="inline-flex items-center gap-1.5"><Kbd keys={["E"]} />Resolve</span>
          <span className="inline-flex items-center gap-1.5"><Kbd keys={["1"]} />to<Kbd keys={["6"]} />Outcome</span>
          <span className="inline-flex items-center gap-1.5"><Kbd keys={["S"]} />Snooze</span>
        </p>}
      </section>
      {!isMobile && current && <div className="sticky top-6"><FollowUpDetail item={current} mended={mendedId === current.id} onClose={() => setSelected(null)} {...detailProps} /></div>}
    </div>
    <Sheet open={mobileOpen && isMobile} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px]"><SheetHeader><SheetTitle>Follow-up</SheetTitle><SheetDescription>Details and next actions</SheetDescription></SheetHeader>{current && <FollowUpDetail item={current} mended={mendedId === current.id} embedded {...detailProps} />}</SheetContent></Sheet>
  </div>;
}
