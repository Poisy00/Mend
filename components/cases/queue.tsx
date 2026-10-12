"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WorkRow } from "@/components/ui/work-row";
import { Eyebrow, PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { StatusPill } from "@/components/ui/status";
import { caseDisplay } from "@/lib/follow-ups/display";
import { displayName } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { WorkRowSkeleton } from "@/components/workspace-skeleton";
import type { CaseRecord, CaseStatus } from "@/lib/cases/types";
import { useMobileDetail } from "@/components/use-mobile-detail";

type Page = { items: CaseRecord[]; nextCursor: string | null };
type History = { id: string; type: string; createdAt: string };
const statuses = ["All", "Open", "Follow-up scheduled", "Handoff prepared", "Closed"] as const;

export function CaseQueue({ initialPage, initialSelected }: { initialPage: Page; initialSelected?: CaseRecord | null }) {
  const [items, setItems] = useState<CaseRecord[]>(() => initialSelected && !initialPage.items.some(item => item.id === initialSelected.id) ? [initialSelected, ...initialPage.items] : initialPage.items);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof statuses)[number]>("All");
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMobileDetail();
  const firstSearch = useRef(true);

  useEffect(() => { if (!initialSelected) return; const timer = window.setTimeout(() => { void select(initialSelected, false); document.getElementById(`case-${initialSelected.id}`)?.scrollIntoView({ block: "nearest" }); }, 0); return () => window.clearTimeout(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key !== "Escape") return; const target = event.target as HTMLElement | null; if (target?.closest("input,textarea,[role=dialog]")) return; setSelected(null); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);

  const url = useCallback((cursor?: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (query) params.set("search", query);
    if (filter !== "All") params.set("status", filter);
    if (cursor) params.set("cursor", cursor);
    return `/api/cases?${params}`;
  }, [query, filter]);

  const refresh = useCallback(async () => {
    const response = await fetch(url());
    if (!response.ok) throw new Error("Unable to load Cases");
    const page = await response.json() as Page;
    setItems(page.items);
    setNextCursor(page.nextCursor);
    setLoading(false);
  }, [url]);

  useEffect(() => { if (firstSearch.current) { firstSearch.current = false; return; } let active = true; fetch(url()).then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Page>; }).then(page => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); setLoading(false); } }).catch(() => { if (active) { setLoading(false); toast.error("Unable to load Cases"); } }); return () => { active = false; }; }, [url]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(url(nextCursor));
      if (!response.ok) throw new Error("Unable to load more Cases");
      const page = await response.json() as Page;
      setItems(current => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch { toast.error("Unable to load more Cases"); } finally { setLoadingMore(false); }
  }

  async function select(item: CaseRecord, openSheet = true) {
    setSelected(item);
    setHistory([]);
    setHistoryLoading(true);
    setMobileOpen(openSheet && isMobile);
    try { const response = await fetch(`/api/cases/${item.id}`);
      if (response.ok) setHistory(((await response.json()) as { history: History[] }).history);
    } finally { setHistoryLoading(false); }
  }

  async function setStatus(status: CaseStatus) {
    if (!selected) return;
    const response = await fetch(`/api/cases/${selected.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, expectedRevision: selected.revision }) });
    const data = await response.json() as { item?: CaseRecord; error?: string };
    if (!response.ok || !data.item) { toast.error(data.error ?? "Unable to update Case"); return; }
    setSelected(data.item);
    toast.success("Case updated");
    await refresh();
    await select(data.item);
  }

  async function removeCase() {
    if (!selected) return;
    const confirmation = window.prompt(`To delete ${selected.humanId} and its history permanently, type DELETE CASE.`);
    if (confirmation === null) return;
    if (confirmation !== "DELETE CASE") { toast.error("Confirmation did not match"); return; }
    const response = await fetch(`/api/cases/${selected.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation, expectedRevision: selected.revision }) });
    if (!response.ok) { toast.error("Unable to delete Case"); return; }
    setSelected(null);
    setHistory([]);
    setMobileOpen(false);
    toast.success("Case deleted");
    await refresh();
  }

  const selectedDisplay = selected ? caseDisplay(selected) : null;
  const detail = selected && selectedDisplay ? <div className="py-5">
    <p className="t-id text-text-secondary">{selected.humanId}</p>
    <h2 className="t-heading mt-2">{displayName(selected.customerName || selected.accountNumber)}</h2>
    <p className="mt-2 flex flex-wrap items-center gap-2"><StatusPill tone={selectedDisplay.tone} icon={selectedDisplay.icon}>{selectedDisplay.label}</StatusPill><span className="text-sm text-text-secondary">· {selected.category} · {selected.priority}</span></p>
    <p className="mt-7 whitespace-pre-wrap border-y border-border py-5 text-sm leading-6">{selected.summary}</p>
    <div className="mt-6 flex flex-wrap gap-2">{selected.status === "Closed" ? <Button variant="secondary" onClick={() => void setStatus("Open")}>Reopen</Button> : <Button onClick={() => void setStatus("Closed")}>Close Case</Button>}<Button variant="destructive" onClick={() => void removeCase()}>Delete Case</Button></div>
    <Eyebrow className="mt-9">History</Eyebrow>
    <div className="mt-3 divide-y divide-border">{historyLoading ? <div className="space-y-3 py-3"><WorkRowSkeleton count={2} /></div> : history.map(entry => { const label = entry.type.replaceAll("_", " "); return <div key={entry.id} className="py-3 text-sm"><p>{label.charAt(0).toUpperCase() + label.slice(1)}</p><p className="t-id text-text-muted">{entry.createdAt}</p></div>; })}</div>
  </div> : null;

  return <div>
    <PageHeader eyebrow="Saved work" title="Cases" description="Only the Cases you choose to save appear here." />
    <div className="mt-8 border-b border-border pb-5"><Segmented label="Filter Cases" options={statuses.map(v => ({ value: v, label: v }))} value={filter} onChange={value => { if (value !== filter) { setLoading(true); setFilter(value); } }} /></div>
    <div className={cn("grid", selected && "min-[1100px]:grid-cols-[minmax(0,1fr)_420px]")}>
      <section className={cn("min-h-[500px] min-w-0", !selected && "max-w-[880px]", selected && "min-[1100px]:border-r min-[1100px]:border-border min-[1100px]:pr-7")}>
        <div className="flex items-center gap-3 py-5"><div className="relative flex-1"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"/><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(event.target.value.trim() !== query); }} placeholder="Search your Cases" aria-label="Search your Cases" className="h-9 rounded-[8px] border-0 bg-sheet pl-9 shadow-[inset_0_0_0_1px_var(--border)] focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]"/></div><span className="t-id text-text-muted">{items.length}{nextCursor ? "+" : ""}</span></div>
        {loading ? <div className="py-4"><WorkRowSkeleton count={5} /></div> : items.length === 0 ? <div className="py-16 text-center"><h2 className="t-heading">No Cases in this view.</h2><p className="t-meta mt-1 text-text-secondary">Save a follow-up or prepared RCC draft when you need a record.</p></div> : <div className="-mx-3">{items.map(item => { const d = caseDisplay(item); return <WorkRow key={item.id} title={item.customerName || item.accountNumber} subtitle={item.summary} id={item.humanId} rowId={`case-${item.id}`} meta={item.category + " · " + item.priority + " priority"} tone={d.tone} statusLabel={d.label} statusIcon={d.icon} left={d.tone === "closed" ? 0 : 1} selected={selected?.id === item.id} onClick={() => void select(item)} />; })}</div>}
        {loadingMore && <WorkRowSkeleton count={2} />}
        {nextCursor && <Button variant="secondary" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more Cases"}</Button>}
      </section>
      {selected && <aside className="mend-pane hidden min-[1100px]:block min-[1100px]:pl-7"><div className="flex justify-end pt-3"><Button variant="ghost" size="sm" onClick={() => setSelected(null)} aria-label="Close details"><X /></Button></div>{detail}</aside>}
    </div>
    <Sheet open={mobileOpen && isMobile} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px]"><SheetHeader><SheetTitle>Case details</SheetTitle><SheetDescription>Saved work and history</SheetDescription></SheetHeader>{detail}</SheetContent></Sheet>
  </div>;
}
