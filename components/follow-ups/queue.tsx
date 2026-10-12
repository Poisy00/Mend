"use client";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, PhoneForwarded, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { rankFollowUp } from "@/lib/follow-ups/rules";
import { followUpDisplay } from "@/lib/follow-ups/display";
import { formatAccountIfComplete } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WorkListHeader, WorkRow } from "@/components/ui/work-row";
import { WorkRowSkeleton } from "@/components/workspace-skeleton";
import { MendLink as Link } from "@/components/mend-link";
import { FollowUpDetail } from "./detail";
import { useMobileDetail } from "@/components/use-mobile-detail";

type Page = { items: FollowUp[]; nextCursor: string | null };

export function FollowUpQueue({ initialPage }: { initialPage: Page }) {
  const [items, setItems] = useState<FollowUp[]>(initialPage.items);
  const [selected, setSelected] = useState<FollowUp | null>(null);
  const [mendedId,setMendedId]=useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMobileDetail();
  const [now, setNow] = useState(0);
  const notified=useRef(new Set<string>());
  const [notificationsEnabled,setNotificationsEnabled]=useState(false);
  const firstSearch = useRef(true);

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const url = useCallback((cursor?: string) => { const params = new URLSearchParams({ limit: "50" }); if (query) params.set("search", query); if (cursor) params.set("cursor", cursor); return `/api/follow-ups?${params}`; }, [query]);
  const refresh = useCallback(async () => { const response = await fetch(url()); if (!response.ok) throw new Error("Unable to load follow-ups"); const page = await response.json() as Page; setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); }, [url]);
  useEffect(() => { if (firstSearch.current) { firstSearch.current = false; return; } let active = true; fetch(url()).then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Page>; }).then(page => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); } }).catch(() => { if (active) { setLoading(false); toast.error("Unable to load follow-ups"); } }); return () => { active = false; }; }, [url]);
  const visible = useMemo(() => [...items].sort((a, b) => rankFollowUp(b, now) - rankFollowUp(a, now)), [items, now]);
  const dueCount=items.filter(item=>!["completed","abandoned","cancelled"].includes(item.status)&&Date.parse(item.dueAt)<=now).length;
  useEffect(()=>{const first=window.setTimeout(()=>setNow(Date.now()),0);const timer=window.setInterval(()=>setNow(Date.now()),30000);return()=>{window.clearTimeout(first);window.clearInterval(timer);};},[]);
  useEffect(()=>{if(!notificationsEnabled||typeof Notification==="undefined"||Notification.permission!=="granted")return;for(const item of items){if(!["completed","abandoned","cancelled"].includes(item.status)&&Date.parse(item.dueAt)<=now&&!notified.current.has(item.id)){new Notification("A Mend follow-up is due",{body:"Open your Follow-ups queue to review it."});notified.current.add(item.id);}}},[items,now,notificationsEnabled]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;const target=event.target as HTMLElement|null;if(target?.closest("input,textarea,[role=dialog]"))return;setSelected(null);};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[]);
  async function enableNotifications(){if(typeof Notification==="undefined"){toast.message("Browser alerts are unavailable. Due follow-ups stay visible here.");return;}try{const permission=await Notification.requestPermission();setNotificationsEnabled(permission==="granted");if(permission!=="granted")toast.message("Due follow-ups will still appear in this queue.");}catch{toast.message("Due follow-ups will still appear in this queue.");}}

  async function loadMore() { if (!nextCursor || loadingMore) return; setLoadingMore(true); try { const response = await fetch(url(nextCursor)); if (!response.ok) throw new Error("Unable to load more follow-ups"); const page = await response.json() as Page; setItems(current => [...current, ...page.items]); setNextCursor(page.nextCursor); setNow(Date.now()); } catch { toast.error("Unable to load more follow-ups"); } finally { setLoadingMore(false); } }
  async function act(item: FollowUp, command: FollowUpCommand) { const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, command }) }); const data = await response.json() as { item?: FollowUp; error?: string }; if (!response.ok || !data.item) { toast.error(data.error ?? "Unable to update follow-up"); await refresh(); return; } toast.success("Follow-up updated"); if(command.type==="resolved"){setMendedId(item.id);window.setTimeout(()=>setMendedId(null),1200);} setSelected(data.item); await refresh(); }
  async function saveProfile(item:FollowUp,profile:Record<string,unknown>){const response=await fetch(`/api/follow-ups/${item.id}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:item.revision,profile})});const data=await response.json() as {item?:FollowUp;error?:string};if(!response.ok||!data.item){toast.error(data.error??"Could not save profile");await refresh();return false;}setSelected(data.item);await refresh();toast.success("Follow-up profile saved");return true;}

  return <div>
    <PageHeader eyebrow="Callbacks" title="Follow-ups" description="The next promise, clearly in view." actions={<Button asChild><Link href="/follow-ups/new"><Plus />New follow-up</Link></Button>} />
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">{dueCount>0?<span role="status"><StatusPill tone="overdue">{dueCount} due now</StatusPill></span>:<p className="text-sm text-muted-foreground">Due calls appear here while this page is open.</p>}<Button variant="ghost" size="sm" onClick={()=>void enableNotifications()}>{notificationsEnabled?<BellRing/>:<Bell/>}{notificationsEnabled?"Browser reminders on":"Enable browser reminders"}</Button></div>
    <div className={cn("mt-5 grid border-t border-border", selected && "min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(350px,.82fr)]")}>
      <section className={cn("min-h-[500px]", selected && "min-[1100px]:border-r min-[1100px]:border-border min-[1100px]:pr-7")}>
        <div className="flex items-center gap-3 border-b border-border py-5"><Search className="size-4 text-muted-foreground"/><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(event.target.value.trim() !== query); }} placeholder="Search your follow-ups" aria-label="Search your follow-ups" className="border-0 bg-transparent shadow-none focus-visible:ring-0"/><span className="type-id text-text-secondary">{items.length}{nextCursor ? "+" : ""}</span></div>
        {loading ? <div className="py-4" aria-label="Loading follow-ups"><WorkRowSkeleton count={5} /></div> : visible.length === 0 ? <div className="grid min-h-[340px] place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary"><PhoneForwarded className="size-5"/></span><h2 className="mt-4 text-lg font-semibold">No follow-ups here yet</h2><p className="mt-1 text-sm text-muted-foreground">Create one to keep the next call in sight.</p></div></div> : <div><WorkListHeader detail="Status / due" />{visible.map(item => {
          const d = followUpDisplay(item, now);
          return <WorkRow key={item.id} title={item.customerName || item.accountNumber} subtitle={item.reason} eyebrow={item.caseNumber || formatAccountIfComplete(item.accountNumber)} meta={new Date(item.dueAt).toLocaleString("en-US", { timeZone: item.sourceTimezone, dateStyle: "medium", timeStyle: "short" })} metaLate={d.tone === "overdue"} tone={d.tone} statusLabel={d.label} left={d.left} mended={mendedId === item.id} selected={selected?.id === item.id} onClick={() => { setSelected(item); setMobileOpen(isMobile); }} />;
        })}</div>}
        {loadingMore && <WorkRowSkeleton count={2} />}
        {nextCursor && <Button variant="outline" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more follow-ups"}</Button>}
      </section>
      {selected && <aside className="mend-enter hidden min-[1100px]:block min-[1100px]:pl-7"><div className="flex justify-end pt-3"><Button variant="ghost" size="sm" onClick={()=>setSelected(null)} aria-label="Close details"><X /></Button></div><FollowUpDetail item={selected} onAction={act} onSaveProfile={saveProfile}/></aside>}
    </div>
    <Sheet open={mobileOpen && isMobile} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px]"><SheetHeader><SheetTitle>Follow-up</SheetTitle><SheetDescription>Details and next actions</SheetDescription></SheetHeader>{selected && <FollowUpDetail item={selected} onAction={act} onSaveProfile={saveProfile}/>}</SheetContent></Sheet>
  </div>;
}
