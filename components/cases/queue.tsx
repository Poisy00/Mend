"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status";
import { CopyButton } from "@/components/ui/copy-button";
import { FadeSwap } from "@/components/focus-line/fade";
import { FilterTabs } from "@/components/focus-line/filter-tabs";
import { LineRow, spineEnds, type LineNode } from "@/components/focus-line/line";
import { cairoDay, cairoFormat } from "@/components/focus-line/timeline";
import { historyLabel } from "@/components/focus-line/actions";
import { relativeTime } from "@/lib/display/relative";
import { caseDisplay } from "@/lib/follow-ups/display";
import { displayName } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { WorkRowSkeleton } from "@/components/workspace-skeleton";
import type { CaseRecord, CaseStatus } from "@/lib/cases/types";
import { useMobileDetail } from "@/components/use-mobile-detail";

type Page = { items: CaseRecord[]; nextCursor: string | null };
type History = { id: string; type: string; createdAt: string };
const statuses = ["All", "Open", "Follow-up scheduled", "Handoff prepared", "Closed"] as const;
const statusTabs = statuses.map(value => ({ key: value, label: value }));
const caseNode: Record<CaseStatus, LineNode> = { Open: "soon", "Follow-up scheduled": "now", "Handoff prepared": "iris", Closed: "done" };
const parseStamp = (value: string) => Date.parse(/^\d{4}-\d\d-\d\d \d/.test(value) ? value.replace(" ", "T") + "Z" : value);
/** Time for today, then "Yesterday", then "Oct 9" (with the year when it is not this year). */
function updatedGutter(value: string, nowMs: number) {
  const ms = parseStamp(value);
  if (!Number.isFinite(ms)) return "";
  const diff = cairoDay(nowMs) - cairoDay(ms);
  if (diff === 0) return cairoFormat({ hour: "numeric", minute: "2-digit" }, ms);
  if (diff === 1) return "Yesterday";
  const sameYear = cairoFormat({ year: "numeric" }, ms) === cairoFormat({ year: "numeric" }, nowMs);
  return cairoFormat({ month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }, ms);
}
const longDate = (value: string) => { const ms = parseStamp(value); return Number.isFinite(ms) ? cairoFormat({ dateStyle: "medium", timeStyle: "short" }, ms) : value; };
const heading = "t-meta mb-2.5 !font-semibold text-text-secondary";

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
  const [listKey, setListKey] = useState(0);

  useEffect(() => { if (!initialSelected) return; const timer = window.setTimeout(() => { void select(initialSelected, false); document.querySelector(`[data-row-id="${CSS.escape(initialSelected.id)}"]`)?.scrollIntoView({ block: "nearest" }); }, 0); return () => window.clearTimeout(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => { if (firstSearch.current) { firstSearch.current = false; return; } let active = true; fetch(url()).then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Page>; }).then(page => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); setLoading(false); setListKey(key => key + 1); } }).catch(() => { if (active) { setLoading(false); toast.error("Unable to load Cases"); } }); return () => { active = false; }; }, [url]);

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

  const now = Date.now();
  const selectedDisplay = selected ? caseDisplay(selected) : null;
  const renderDetail = (embedded: boolean) => selected && selectedDisplay ? <aside aria-label="Selected Case" className={cn("relative", !embedded && "mend-pane max-h-[calc(100dvh-3rem)] overflow-auto overscroll-contain rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border),0_12px_32px_-20px_rgb(0_0_0/.18)]")}>
    {!embedded && <Button variant="ghost" size="icon-sm" onClick={() => setSelected(null)} aria-label="Close details" className="absolute top-3 right-3"><X /></Button>}
    <FadeSwap swapKey={selected.id} speed="panel">
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill tone={selectedDisplay.tone} icon={selectedDisplay.icon}>{selectedDisplay.label}</StatusPill>
      {selected.priority === "High" && selected.status !== "Closed" && <span className="t-caption rounded-full bg-status-overdue-tint px-2 py-0.5 !font-semibold text-status-overdue">High priority</span>}
    </div>
    <h2 className="mt-3 text-[24px] leading-[1.2] font-semibold tracking-[-0.02em]">{displayName(selected.customerName || selected.accountNumber)}</h2>
    <p className="t-body-lg mt-1.5 whitespace-pre-wrap text-text-secondary">{selected.summary}</p>
    <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3.5">
      <div><dt className="t-caption text-text-secondary">Case</dt><dd className="t-label"><span className="flex items-center gap-1"><span className="num">{selected.humanId}</span><CopyButton value={selected.humanId} label="Case number" /></span></dd></div>
      <div><dt className="t-caption text-text-secondary">Account</dt><dd className="t-label">{selected.accountNumber ? <span className="flex items-center gap-1"><span className="num">{selected.accountNumber}</span><CopyButton value={selected.accountNumber} label="account number" /></span> : "Not saved"}</dd></div>
      <div><dt className="t-caption text-text-secondary">Category</dt><dd className="t-label">{selected.category}</dd></div>
      <div><dt className="t-caption text-text-secondary">Priority</dt><dd className="t-label">{selected.priority}</dd></div>
      <div className="col-span-2"><dt className="t-caption text-text-secondary">Last updated</dt><dd className="t-label">{longDate(selected.updatedAt)}</dd></div>
    </dl>
    <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-border pt-5">{selected.status === "Closed" ? <Button variant="outline" onClick={() => void setStatus("Open")}>Reopen</Button> : <Button onClick={() => void setStatus("Closed")}>Close Case</Button>}<Button variant="destructive" className="ml-auto" onClick={() => void removeCase()}>Delete Case</Button></div>
    <section className="mt-6" aria-label="Case history">
      <h3 className={heading}>History</h3>
      {historyLoading ? <div className="space-y-3 py-1"><WorkRowSkeleton count={2} /></div>
        : history.length ? <ul>{history.map(entry => <li key={entry.id} className="t-meta grid grid-cols-[80px_1fr] gap-3 py-1.5"><span className="whitespace-nowrap text-text-muted">{relativeTime(entry.createdAt, now)}</span><span>{historyLabel(entry.type)}</span></li>)}</ul>
        : <p className="t-meta text-text-secondary">No history yet.</p>}
    </section>
    </FadeSwap>
  </aside> : null;

  return <div>
    <PageHeader eyebrow="Saved work" title="Cases" description="Only the Cases you choose to save appear here." />
    <div className={cn("mt-8 grid items-start gap-10", selected && "min-[1100px]:grid-cols-[minmax(0,1fr)_400px]")}>
      <section className="min-h-[500px] min-w-0" aria-label="Cases">
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="relative min-w-[min(100%,220px)] flex-[0_1_300px]"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"/><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(event.target.value.trim() !== query); }} placeholder="Search your Cases" aria-label="Search your Cases" className="h-10 rounded-[10px] border-0 bg-secondary pl-9 shadow-none focus-visible:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]"/></div>
          <FilterTabs label="Filter Cases" tabs={statusTabs} value={filter} onChange={value => { if (value !== filter) setFilter(value); }} />
          <p className="t-meta ml-auto text-text-secondary"><span className="num">{items.length}{nextCursor ? "+" : ""}</span> {items.length === 1 && !nextCursor ? "Case" : "Cases"}</p>
        </div>
        <FadeSwap swapKey={listKey}>{loading ? <div className="py-4"><WorkRowSkeleton count={5} /></div> : items.length === 0 ? <div className="py-16 text-center"><h2 className="t-heading">No Cases in this view.</h2><p className="t-meta mt-1 text-text-secondary">Save a follow-up or prepared RCC draft when you need a record.</p></div> : <ul>{items.map((item, index) => { const d = caseDisplay(item); return <LineRow key={item.id} id={item.id} ends={spineEnds(index === 0, index === items.length - 1)} gutter={updatedGutter(item.updatedAt, now)} node={caseNode[item.status]} name={item.customerName || item.accountNumber} ident={item.humanId} subtitle={item.summary} label={d.label} quiet={item.status === "Closed"} selected={selected?.id === item.id} onSelect={() => void select(item)} mended={false} leaving={false} onStitchEnd={() => {}} />; })}</ul>}</FadeSwap>
        {loadingMore && <WorkRowSkeleton count={2} />}
        {nextCursor && <Button variant="secondary" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more Cases"}</Button>}
      </section>
      {selected && <div className="sticky top-6 hidden min-[1100px]:block">{renderDetail(false)}</div>}
    </div>
    <Sheet open={mobileOpen && isMobile} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px]"><SheetHeader><SheetTitle>Case details</SheetTitle><SheetDescription>Saved work and history</SheetDescription></SheetHeader>{renderDetail(true)}</SheetContent></Sheet>
  </div>;
}
