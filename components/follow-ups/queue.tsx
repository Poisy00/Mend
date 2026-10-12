"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, ChevronRight, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";
import { dueCaption, followUpDisplay, queueGroupLabel, type QueueGroup } from "@/lib/follow-ups/display";
import { formatAccountIfComplete } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { IconSwap } from "@/components/ui/icon-swap";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GroupLabel, WorkRow } from "@/components/ui/work-row";
import { WorkRowSkeleton } from "@/components/workspace-skeleton";
import { MendLink as Link } from "@/components/mend-link";
import { refreshQueueCounts } from "@/components/use-queue-counts";
import { QueueSummary } from "./queue-summary";
import { FollowUpDetail } from "./detail";
import { useMobileDetail } from "@/components/use-mobile-detail";

type Page = { items: FollowUp[]; nextCursor: string | null };
const groupOrder: QueueGroup[] = ["overdue", "now", "soon", "waiting"];
const groupTone: Record<QueueGroup, string> = { overdue: "text-status-overdue", now: "text-status-due", soon: "text-foreground", waiting: "text-text-secondary" };
const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function FollowUpQueue({ initialPage, initialSelected }: { initialPage: Page; initialSelected?: FollowUp | null }) {
  const [items, setItems] = useState<FollowUp[]>(() => initialSelected && !initialPage.items.some(item => item.id === initialSelected.id) ? [initialSelected, ...initialPage.items] : initialPage.items);
  const [selected, setSelected] = useState<FollowUp | null>(() => {
    if (initialSelected) return initialSelected;
    const first = [...initialPage.items].sort((a, b) => rankFollowUp(b, Date.now()) - rankFollowUp(a, Date.now())).find(item => ["overdue", "now"].includes(classifyFollowUp(item, Date.now())));
    return first ?? null;
  });
  const [mendedId, setMendedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const isMobile = useMobileDetail();
  const [now, setNow] = useState(0);
  const notified = useRef(new Set<string>());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const firstSearch = useRef(true);
  const scrolledToInitial = useRef(false);

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const url = useCallback((cursor?: string) => { const params = new URLSearchParams({ limit: "50" }); if (query) params.set("search", query); if (cursor) params.set("cursor", cursor); return `/api/follow-ups?${params}`; }, [query]);
  const refresh = useCallback(async () => { const response = await fetch(url()); if (!response.ok) throw new Error("Unable to load follow-ups"); const page = await response.json() as Page; setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); }, [url]);
  useEffect(() => { if (firstSearch.current) { firstSearch.current = false; return; } let active = true; fetch(url()).then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Page>; }).then(page => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); } }).catch(() => { if (active) { setLoading(false); toast.error("Unable to load follow-ups"); } }); return () => { active = false; }; }, [url]);

  const groups = useMemo(() => {
    const ranked = [...items].sort((a, b) => rankFollowUp(b, now) - rankFollowUp(a, now));
    return {
      open: groupOrder.map(group => ({ group, rows: ranked.filter(item => classifyFollowUp(item, now) === group) })).filter(entry => entry.rows.length),
      completed: ranked.filter(item => classifyFollowUp(item, now) === "completed"),
    };
  }, [items, now]);
  const counts = useMemo(() => {
    const of = (group: QueueGroup) => items.filter(item => classifyFollowUp(item, now) === group).length;
    return { overdue: of("overdue"), now: of("now"), soon: of("soon"), waiting: of("waiting") };
  }, [items, now]);

  useEffect(() => { const first = window.setTimeout(() => setNow(Date.now()), 0); const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => { window.clearTimeout(first); window.clearInterval(timer); }; }, []);
  useEffect(() => { if (!selected || scrolledToInitial.current) return; scrolledToInitial.current = true; document.getElementById(`follow-up-${selected.id}`)?.scrollIntoView({ block: "nearest" }); }, [selected]);
  useEffect(() => { if (!notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return; for (const item of items) { if (!["completed", "abandoned", "cancelled"].includes(item.status) && Date.parse(item.dueAt) <= now && !notified.current.has(item.id)) { new Notification("A Mend follow-up is due", { body: "Open your Follow-ups queue to review it." }); notified.current.add(item.id); } } }, [items, now, notificationsEnabled]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key !== "Escape") return; const target = event.target as HTMLElement | null; if (target?.closest("input,textarea,[role=dialog]")) return; setSelected(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  async function enableNotifications() { if (typeof Notification === "undefined") { toast.message("Browser alerts are unavailable. Due follow-ups stay visible here."); return; } try { const permission = await Notification.requestPermission(); setNotificationsEnabled(permission === "granted"); if (permission !== "granted") toast.message("Due follow-ups will still appear in this queue."); } catch { toast.message("Due follow-ups will still appear in this queue."); } }

  async function loadMore() { if (!nextCursor || loadingMore) return; setLoadingMore(true); try { const response = await fetch(url(nextCursor)); if (!response.ok) throw new Error("Unable to load more follow-ups"); const page = await response.json() as Page; setItems(current => [...current, ...page.items]); setNextCursor(page.nextCursor); setNow(Date.now()); } catch { toast.error("Unable to load more follow-ups"); } finally { setLoadingMore(false); } }
  async function act(item: FollowUp, command: FollowUpCommand) {
    const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, command }) });
    const data = await response.json() as { item?: FollowUp; error?: string };
    if (!response.ok || !data.item) { toast.error(response.status === 409 ? "Unable to update this follow-up. It changed elsewhere — refreshed." : `Unable to update this follow-up.${data.error ? " " + data.error : ""}`); await refresh(); return; }
    const rescheduled = ["busy", "no_answer", "follow_up", "escalation_required", "reschedule"].includes(command.type) && data.item.status !== "voicemail_required";
    toast.success(command.type === "resolved" ? "Marked resolved." : rescheduled ? `Rescheduled to ${clockTime(data.item.dueAt)}.` : command.type === "restore" ? "Follow-up restored." : "Follow-up updated.");
    if (command.type === "resolved") { setMendedId(item.id); window.setTimeout(() => setMendedId(null), 1200); }
    setSelected(data.item); await refresh(); void refreshQueueCounts();
  }
  async function saveProfile(item: FollowUp, profile: Record<string, unknown>) { const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, profile }) }); const data = await response.json() as { item?: FollowUp; error?: string }; if (!response.ok || !data.item) { toast.error(data.error ?? "Unable to save the follow-up profile."); await refresh(); return false; } setSelected(data.item); await refresh(); toast.success("Follow-up profile saved."); return true; }

  const row = (item: FollowUp) => {
    const d = followUpDisplay(item, now);
    return <WorkRow key={item.id} rowId={`follow-up-${item.id}`} title={item.customerName || item.accountNumber} subtitle={item.reason} id={item.caseNumber || formatAccountIfComplete(item.accountNumber)} meta={dueCaption(item, now)} metaLate={d.tone === "overdue"} tone={d.tone} statusLabel={d.label} left={d.left} mended={mendedId === item.id} selected={selected?.id === item.id} onClick={() => { setSelected(item); setMobileOpen(isMobile); }} />;
  };

  return <div>
    <PageHeader eyebrow="Callbacks" title="Follow-ups" description="The next promise, clearly in view." actions={<Button asChild><Link href="/follow-ups/new"><Plus />New follow-up</Link></Button>} />
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="t-body-lg text-text-secondary"><QueueSummary counts={counts} /></p>
      <Button variant="ghost" size="sm" onClick={() => void enableNotifications()}><IconSwap from={<Bell strokeWidth={1.75} className="size-4" />} to={<BellRing strokeWidth={1.75} className="size-4" />} swapped={notificationsEnabled} />{notificationsEnabled ? "Reminders on" : "Enable browser reminders"}</Button>
    </div>
    <div className={cn("mt-5 grid border-t border-border", selected && "min-[1100px]:grid-cols-[minmax(0,1fr)_420px]")}>
      <section className={cn("min-h-[500px] min-w-0 pt-5", !selected && "max-w-[880px]", selected && "min-[1100px]:border-r min-[1100px]:border-border min-[1100px]:pr-7")}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" /><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(event.target.value.trim() !== query); }} placeholder="Search your follow-ups" aria-label="Search your follow-ups" className="h-9 rounded-[8px] border-0 bg-sheet pl-9 shadow-[inset_0_0_0_1px_var(--border)] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]" /></div>
          <span className="t-id text-text-muted">{items.length}{nextCursor ? "+" : ""}</span>
        </div>
        <div className="-mx-3 mt-2">
          {loading ? <div className="py-4" aria-label="Loading follow-ups"><WorkRowSkeleton count={5} /></div> : items.length === 0 ? <div className="py-16 text-center"><h2 className="t-heading">{query ? "No matching follow-ups." : "No follow-ups here yet."}</h2><p className="t-meta mt-1 text-text-secondary">{query ? "Try a different name, account or case number." : "Create one to keep the next call in sight."}</p></div> : <>
            {groups.open.map(({ group, rows }, index) => <section key={group} aria-label={queueGroupLabel[group]}><GroupLabel first={index === 0} count={rows.length} className={cn("px-3", groupTone[group])}>{queueGroupLabel[group]}</GroupLabel>{rows.map(row)}</section>)}
            {groups.completed.length > 0 && <section aria-label="Completed">
              <h3 className="mt-5"><button type="button" aria-expanded={showCompleted} onClick={() => setShowCompleted(value => !value)} className="t-eyebrow flex h-8 w-full items-end gap-1.5 rounded-[8px] px-3 pb-1.5 text-text-secondary outline-none focus-visible:outline-2 focus-visible:outline-ring"><ChevronRight aria-hidden="true" className={cn("mb-px size-3.5 transition-transform duration-[var(--dur-quick)] ease-[var(--ease-out)] motion-move", showCompleted && "rotate-90")} />Completed<span className="t-id !text-[11px] text-text-muted">{groups.completed.length}</span></button></h3>
              {showCompleted && groups.completed.map(row)}
            </section>}
          </>}
          {loadingMore && <WorkRowSkeleton count={2} />}
        </div>
        {nextCursor && <Button variant="secondary" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more follow-ups"}</Button>}
      </section>
      {selected && <aside className="mend-pane hidden min-[1100px]:block min-[1100px]:pl-7"><div className="flex justify-end pt-3"><Button variant="ghost" size="icon-sm" onClick={() => setSelected(null)} aria-label="Close details"><X /></Button></div><FollowUpDetail item={selected} onAction={act} onSaveProfile={saveProfile} /></aside>}
    </div>
    <Sheet open={mobileOpen && isMobile} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px]"><SheetHeader><SheetTitle>Follow-up</SheetTitle><SheetDescription>Details and next actions</SheetDescription></SheetHeader>{selected && <FollowUpDetail item={selected} onAction={act} onSaveProfile={saveProfile} />}</SheetContent></Sheet>
  </div>;
}
