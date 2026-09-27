"use client";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhoneForwarded, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { classifyFollowUp, rankFollowUp } from "@/lib/follow-ups/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WorkListHeader, WorkRow } from "@/components/ui/work-row";
import { FollowUpDetail } from "./detail";

type Page = { items: FollowUp[]; nextCursor: string | null };

export function FollowUpQueue() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [selected, setSelected] = useState<FollowUp | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(0);
  const notified=useRef(new Set<string>());
  const [notificationsEnabled,setNotificationsEnabled]=useState(false);

  useEffect(() => { const timer = window.setTimeout(() => setQuery(search.trim()), 250); return () => window.clearTimeout(timer); }, [search]);
  const url = useCallback((cursor?: string) => { const params = new URLSearchParams({ limit: "50" }); if (query) params.set("search", query); if (cursor) params.set("cursor", cursor); return `/api/follow-ups?${params}`; }, [query]);
  const refresh = useCallback(async () => { const response = await fetch(url()); if (!response.ok) throw new Error("Unable to load follow-ups"); const page = await response.json() as Page; setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); }, [url]);
  useEffect(() => { let active = true; fetch(url()).then(response => response.json() as Promise<Page>).then(page => { if (active) { setItems(page.items); setNextCursor(page.nextCursor); setNow(Date.now()); setLoading(false); } }).catch(() => { if (active) { setLoading(false); toast.error("Unable to load follow-ups"); } }); return () => { active = false; }; }, [url]);
  const visible = useMemo(() => [...items].sort((a, b) => rankFollowUp(b, now) - rankFollowUp(a, now)), [items, now]);
  const dueCount=items.filter(item=>!["completed","abandoned","cancelled"].includes(item.status)&&Date.parse(item.dueAt)<=now).length;
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{if(!notificationsEnabled||typeof Notification==="undefined"||Notification.permission!=="granted")return;for(const item of items){if(!["completed","abandoned","cancelled"].includes(item.status)&&Date.parse(item.dueAt)<=now&&!notified.current.has(item.id)){new Notification("A Mend follow-up is due",{body:"Open your Follow-ups queue to review it."});notified.current.add(item.id);}}},[items,now,notificationsEnabled]);
  async function enableNotifications(){if(typeof Notification==="undefined"){toast.message("Browser alerts are unavailable. Due follow-ups stay visible here.");return;}try{const permission=await Notification.requestPermission();setNotificationsEnabled(permission==="granted");if(permission!=="granted")toast.message("Due follow-ups will still appear in this queue.");}catch{toast.message("Due follow-ups will still appear in this queue.");}}

  async function loadMore() { if (!nextCursor || loadingMore) return; setLoadingMore(true); try { const response = await fetch(url(nextCursor)); if (!response.ok) throw new Error("Unable to load more follow-ups"); const page = await response.json() as Page; setItems(current => [...current, ...page.items]); setNextCursor(page.nextCursor); setNow(Date.now()); } catch { toast.error("Unable to load more follow-ups"); } finally { setLoadingMore(false); } }
  async function act(item: FollowUp, command: FollowUpCommand) { const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, command }) }); const data = await response.json() as { item?: FollowUp; error?: string }; if (!response.ok || !data.item) { toast.error(data.error ?? "Unable to update follow-up"); await refresh(); return; } toast.success("Follow-up updated"); setSelected(data.item); await refresh(); }
  async function saveProfile(item:FollowUp,profile:Record<string,unknown>){const response=await fetch(`/api/follow-ups/${item.id}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:item.revision,profile})});const data=await response.json() as {item?:FollowUp;error?:string};if(!response.ok||!data.item){toast.error(data.error??"Could not save profile");await refresh();return false;}setSelected(data.item);await refresh();toast.success("Follow-up profile saved");return true;}

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">CALLBACKS</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Follow-ups</h1><p className="mt-2 text-muted-foreground">The next promise, clearly in view.</p></div><Button asChild><a href="/follow-ups/new"><Plus />New follow-up</a></Button></div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">{dueCount>0?<p role="status" className="rounded-lg border border-primary/25 bg-accent px-4 py-2 text-sm font-medium">{dueCount} follow-up{dueCount===1?" is":"s are"} due now</p>:<p className="text-sm text-muted-foreground">Due calls appear here while this page is open.</p>}<Button variant="ghost" size="sm" onClick={()=>void enableNotifications()}>{notificationsEnabled?"Browser reminders on":"Enable browser reminders"}</Button></div>
    <div className="mt-5 grid gap-0 border-t border-border min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(350px,.82fr)]">
      <section className="min-h-[500px] min-[1100px]:border-r min-[1100px]:border-border min-[1100px]:pr-7">
        <div className="flex items-center gap-3 border-b border-border py-5"><Search className="size-4 text-muted-foreground"/><Input value={search} onChange={event => { setSearch(event.target.value); setLoading(true); }} placeholder="Search your follow-ups" aria-label="Search your follow-ups" className="border-0 bg-transparent shadow-none focus-visible:ring-0"/><span className="text-sm text-muted-foreground">{items.length}{nextCursor ? "+" : ""}</span></div>
        {loading ? <div className="space-y-3 py-5" aria-label="Loading follow-ups">{[0, 1, 2].map(index => <div key={index} className="h-[74px] animate-pulse rounded-lg bg-muted"/>)}</div> : visible.length === 0 ? <div className="grid min-h-[340px] place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary"><PhoneForwarded className="size-5"/></span><h2 className="mt-4 text-lg font-semibold">No follow-ups here yet</h2><p className="mt-1 text-sm text-muted-foreground">Create one to keep the next call in sight.</p></div></div> : <div><WorkListHeader detail="Status / due" />{visible.map(item => {
          const status = classifyFollowUp(item, now).replaceAll("_", " ");
          const closed = ["completed", "abandoned", "cancelled"].includes(item.status);
          return <WorkRow key={item.id} title={item.customerName || item.accountNumber} subtitle={item.reason} eyebrow={item.caseNumber || item.accountNumber} meta={new Date(item.dueAt).toLocaleString("en-US", { timeZone: item.sourceTimezone, dateStyle: "medium", timeStyle: "short" })} status={status} tone={closed ? "complete" : Date.parse(item.dueAt) <= now ? "urgent" : "default"} selected={selected?.id === item.id} onClick={() => { setSelected(item); setMobileOpen(true); }} />;
        })}</div>}
        {nextCursor && <Button variant="outline" className="my-5 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more follow-ups"}</Button>}
      </section>
      <aside className="hidden min-[1100px]:block min-[1100px]:pl-7">{selected ? <FollowUpDetail item={selected} onAction={act} onSaveProfile={saveProfile}/> : <div className="grid min-h-[380px] place-items-center text-center text-sm text-muted-foreground">Select a follow-up to see its details and next actions.</div>}</aside>
    </div>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="right" className="w-full overflow-auto p-6 sm:max-w-[480px] min-[1100px]:hidden"><SheetHeader><SheetTitle>Follow-up</SheetTitle><SheetDescription>Details and next actions</SheetDescription></SheetHeader>{selected && <FollowUpDetail item={selected} onAction={act} onSaveProfile={saveProfile}/>}</SheetContent></Sheet>
  </div>;
}
