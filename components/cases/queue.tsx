"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WorkListHeader, WorkRow } from "@/components/ui/work-row";
import { WorkRowSkeleton } from "@/components/workspace-skeleton";
import type { CaseRecord, CaseStatus } from "@/lib/cases/types";
import { useMobileDetail } from "@/components/use-mobile-detail";

type Page = { items: CaseRecord[]; nextCursor: string | null };
type History = { id: string; type: string; createdAt: string };
const statuses = ["All", "Open", "Follow-up scheduled", "Handoff prepared", "Closed"] as const;

export function CaseQueue({ initialPage }: { initialPage: Page }) {
  const [items, setItems] = useState<CaseRecord[]>(initialPage.items);
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

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);

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

  async function select(item: CaseRecord) {
    setSelected(item);
    setHistory([]);
    setHistoryLoading(true);
    setMobileOpen(isMobile);
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

  const detail = selected ? <div className="py-5">
    <p className="text-xs font-medium uppercase tracking-wide text-primary">{selected.humanId}</p>
    <h2 className="mt-2 text-2xl font-semibold">{selected.customerName || selected.accountNumber}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{selected.status} · {selected.category} · {selected.priority}</p>
    <p className="mt-7 whitespace-pre-wrap border-y border-border py-5 text-sm leading-6">{selected.summary}</p>
    <div className="mt-6 flex flex-wrap gap-2">{selected.status === "Closed" ? <Button variant="outline" onClick={() => void setStatus("Open")}>Reopen</Button> : <Button onClick={() => void setStatus("Closed")}>Close Case</Button>}<Button variant="ghost" onClick={() => void removeCase()}>Delete Case</Button></div>
    <h3 className="mt-9 text-sm font-semibold">History</h3>
    <div className="mt-3 divide-y divide-border">{historyLoading ? <div className="space-y-3 py-3"><WorkRowSkeleton count={2} /></div> : history.map(entry => <div key={entry.id} className="py-3 text-sm"><p>{entry.type.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{entry.createdAt}</p></div>)}</div>
  </div> : <div className="grid min-h-[360px] place-items-center text-center text-sm text-muted-foreground">Select a Case to see its details and history.</div>;

  return <div>
    <p className="text-sm font-medium text-primary">SAVED WORK</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Cases</h1><p className="mt-3 text-muted-foreground">Only the Cases you choose to save appear here.</p>
    <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-5">{statuses.map(value => <button key={value} onClick={() => { if (value !== filter) { setLoading(true); setFilter(value); } }} className={"rounded-lg px-3 py-2 text-sm " + (filter === value ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted")}>{value}</button>)}</div>
    <div className="grid min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(350px,.82fr)]">
      <section className="min-h-[500px] min-[1100px]:border-r min-[1100px]:border-border min-[1100px]:pr-7">
        <div className="flex items-center gap-3 border-b border-border py-5"><Search className="size-4 text-muted-foreground"/><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(event.target.value.trim() !== query); }} placeholder="Search your Cases" aria-label="Search your Cases" className="border-0 bg-transparent shadow-none focus-visible:ring-0"/><span className="text-sm text-muted-foreground">{items.length}{nextCursor ? "+" : ""}</span></div>
        {loading ? <div className="py-4"><WorkRowSkeleton count={5} /></div> : items.length === 0 ? <div className="grid min-h-[340px] place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary"><FolderOpen className="size-5"/></span><h2 className="mt-4 text-lg font-semibold">No Cases in this view</h2><p className="mt-1 text-sm text-muted-foreground">Save a follow-up or prepared RCC draft when you need a record.</p></div></div> : <div><WorkListHeader detail="Status / priority" />{items.map(item => <WorkRow key={item.id} title={item.customerName || item.accountNumber} subtitle={item.summary} eyebrow={item.humanId} meta={item.category + " · " + item.priority + " priority"} status={item.status} tone={item.status === "Closed" ? "complete" : item.priority === "High" ? "urgent" : "default"} selected={selected?.id === item.id} onClick={() => void select(item)} />)}</div>}
        {loadingMore && <WorkRowSkeleton count={2} />}
        {nextCursor && <Button variant="outline" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more Cases"}</Button>}
      </section>
      <aside className="hidden min-[1100px]:block min-[1100px]:pl-7">{detail}</aside>
    </div>
    <Sheet open={mobileOpen && isMobile} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px]"><SheetHeader><SheetTitle>Case details</SheetTitle><SheetDescription>Saved work and history</SheetDescription></SheetHeader>{detail}</SheetContent></Sheet>
  </div>;
}
