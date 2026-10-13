"use client";
import { MendDatePicker } from "@/components/ui/mend-date-picker";
import { MendSelect } from "@/components/ui/mend-select";
import { useEffect,useMemo,useRef,useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight,ChevronDown,Clipboard,Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";import { PageHeader } from "@/components/ui/page-header";import { Kbd } from "@/components/ui/kbd";import { Input } from "@/components/ui/input";import { Label } from "@/components/ui/label";import { Textarea } from "@/components/ui/textarea";
import { SaveCaseDialog } from "@/components/cases/save-dialog";
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilterTabs } from "@/components/focus-line/filter-tabs";
import { ReadinessChecklist } from "./readiness-checklist";
import { RouteCard } from "./route-card";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from "@/components/ui/dialog";
import { resolveExpediteRoute } from "@/lib/rcc/expedite-routing";import { assessExpedite } from "@/lib/rcc/expedite-readiness";import { buildExpediteEmail } from "@/lib/rcc/expedite-email";import { copyRichEmail } from "@/lib/rcc/copy-rich-email";import type { ExpediteInput,RccPreferences } from "@/lib/rcc/types";import { DEFAULT_EXPEDITE_ACTION,EXPEDITE_TEMPLATES,EXPEDITE_REASONS,APPOINTMENT_WINDOWS,CUSTOM_APPOINTMENT_WINDOW,applyExpediteTemplate } from "@/lib/rcc/expedite-templates";
import { formatAccount, formatPhone } from "@/lib/rcc/format-identifiers";
import type { SavedDraft } from "@/lib/rcc/initial-state";
const blank:ExpediteInput={teamMode:"auto",account:"",phone:"",customerName:"",date:"",window:APPOINTMENT_WINDOWS[0],customWindow:"",reason:"",summary:"",action:DEFAULT_EXPEDITE_ACTION,scheduled:true};
const templateGroups = [
  { label: "Connectivity", ids: ["no-internet", "outage", "degradation", "repeat"] },
  { label: "Appointment and retention", ids: ["missed", "cancel"] },
  { label: "Special cases", ids: ["business", "damage"] },
];
const viewTabs:{key:"compose"|"preview";label:string}[]=[{key:"compose",label:"Compose"},{key:"preview",label:"Preview"}];
const routeTabs:{key:ExpediteInput["teamMode"];label:string}[]=[{key:"auto",label:"Automatic"},{key:"long-island",label:"Long Island"},{key:"nassau",label:"Nassau"}];
type PreviousRequest={id:string;payload:ExpediteInput;draft:{to:string;subject:string};createdAt:string};
const outlookLink=(to:string,subject:string)=>`/outlook-handoff?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}`;
export function ExpediteForm({initialDraft,initialPreferences}:{initialDraft:SavedDraft<ExpediteInput>;initialPreferences:RccPreferences}){const [form,setForm]=useState<ExpediteInput>(()=>initialDraft?{...blank,...initialDraft.payload,account:formatAccount(initialDraft.payload.account),phone:formatPhone(initialDraft.payload.phone)}:blank),[prefs,setPrefs]=useState<RccPreferences>(initialPreferences),[revision,setRevision]=useState(initialDraft?.revision??0),[pending,setPending]=useState(false),[notice,setNotice]=useState(""),[lastOutlookLink,setLastOutlookLink]=useState(""),[previous,setPrevious]=useState<PreviousRequest|null>(null),[view,setView]=useState<"compose"|"preview">("compose");
const [attempted,setAttempted]=useState(false),[selectedTemplate,setSelectedTemplate]=useState<string | null>(()=>initialDraft?EXPEDITE_TEMPLATES.find(item=>item.reason===initialDraft.payload.reason&&item.summary===initialDraft.payload.summary)?.id??null:null);
const [lastSavedPayload,setLastSavedPayload]=useState(()=>JSON.stringify(initialDraft?{...blank,...initialDraft.payload}:blank));
const summaryRef=useRef<HTMLTextAreaElement>(null);
const focusSummaryRef=useRef(false);
const preparingRef=useRef(false);
const saveQueue=useRef<Promise<unknown>>(Promise.resolve());
const latest=useRef({revision:initialDraft?.revision??0,payload:JSON.stringify(initialDraft?{...blank,...initialDraft.payload}:blank)});
function patch<K extends keyof ExpediteInput>(key:K,value:ExpediteInput[K]){setForm(current=>({...current,[key]:value}));}
function save(payload:ExpediteInput):Promise<number>{const serialized=JSON.stringify(payload);const send=async()=>{if(serialized===latest.current.payload)return latest.current.revision;const response=await fetch("/api/rcc/drafts/expedite",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({payload,expectedRevision:latest.current.revision})});const data:any=await response.json();if(!response.ok)throw new Error(data.error??"Unable to save draft");latest.current={revision:data.revision,payload:serialized};setLastSavedPayload(serialized);setRevision(data.revision);return data.revision as number;};const result=saveQueue.current.then(send,send);saveQueue.current=result;return result;}
useEffect(()=>{if(JSON.stringify(form)===latest.current.payload)return;const timer=setTimeout(()=>{if(!preparingRef.current)void save(form).catch(()=>toast.error("Draft could not be saved"));},800);return()=>clearTimeout(timer);},[form]);
useEffect(()=>{let active=true;void fetch("/api/rcc/handoffs?workflow=expedite").then(response=>response.ok?response.json():null).then(data=>{const result=data as {handoff:PreviousRequest|null}|null;if(active&&result?.handoff)setPrevious(current=>current??result.handoff);}).catch(()=>{});return()=>{active=false;};},[]);
const route=useMemo(()=>resolveExpediteRoute(form,new Date()),[form]);const readiness=assessExpedite(form,prefs,route);const draft=buildExpediteEmail(form,prefs,route);const recipient=route.id==="long-island"?prefs.longIslandEmail:prefs.nassauEmail;
const previewHtml=draft.html.split("<!--StartFragment-->")[1]?.split("<!--EndFragment-->")[0] ?? "";
async function savePrefs(){const response=await fetch("/api/rcc/preferences",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(prefs)});if(response.ok)toast.success("Recipients and signature saved");else toast.error("Could not save settings");}
function downloadFile(contents:string,type:string,extension:string){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`Expedite-${form.account||"request"}.${extension}`;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadHtml(){downloadFile(draft.html,"text/html;charset=utf-8","html");}
function downloadEml(){const body=[`To: ${draft.to}`,`Subject: ${draft.subject}`,"X-Unsent: 1","MIME-Version: 1.0","Content-Type: text/html; charset=UTF-8","","",draft.html].join("\r\n");downloadFile(body,"message/rfc822","eml");}
function newRequest(){setForm({...blank});setSelectedTemplate(null);setNotice("");setAttempted(false);setView("compose");toast.success("New request ready");}
async function restoreLast(){try{const response=await fetch("/api/rcc/handoffs?workflow=expedite");if(!response.ok)throw new Error("Could not load the last request");const result=await response.json() as {handoff?:PreviousRequest|null};if(!result.handoff){toast.message("No prepared request to restore yet");return;}setPrevious(result.handoff);setForm({...blank,...result.handoff.payload,account:formatAccount(result.handoff.payload.account),phone:formatPhone(result.handoff.payload.phone)});setSelectedTemplate(EXPEDITE_TEMPLATES.find(item=>item.reason===result.handoff?.payload.reason&&item.summary===result.handoff?.payload.summary)?.id??null);setNotice("");setView("compose");toast.success("Previous request restored for editing");}catch(error){toast.error(error instanceof Error?error.message:"Could not restore request");}}
async function copyFormatted(){try{await copyRichEmail(draft);toast.success("Formatted email copied — paste into Outlook");return true;}catch{setNotice("Formatted copying was blocked. Download the HTML or .eml from More options.");toast.error("Formatted email could not be copied");return false;}}
async function prepare(){if(preparingRef.current)return;if(!readiness.ready){setAttempted(true);setView("compose");toast.error("Complete the required items before opening Outlook");return;}preparingRef.current=true;const prepared={...form},message=draft;const popup=window.open("about:blank","_blank");if(popup)popup.opener=null;setPending(true);setNotice("");const link=outlookLink(message.to,message.subject);setLastOutlookLink(link);try{const copied=await copyFormatted();if(popup)popup.location.replace(link);setNotice(popup?(copied?"Formatted email copied. Paste it into the Outlook message body.":"Outlook opened, but formatted copying was blocked. Download the HTML or .eml from More options."):(copied?"Formatted email copied. Your browser blocked the new tab; use the Outlook link below.":"Your browser blocked the Outlook tab and formatted copying. Use the link below and download the HTML or .eml from More options."));try{const draftRevision=await save(prepared);const response=await fetch("/api/rcc/handoffs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workflow:"expedite",draftRevision})});const data:any=await response.json();if(!response.ok)throw new Error(data.error??"Unable to save prepared request");setPrevious({id:data.handoff.id,payload:prepared,draft:{to:message.to,subject:message.subject},createdAt:data.handoff.createdAt});await save({...blank});setForm({...blank});setSelectedTemplate(null);setAttempted(false);setView("compose");toast.success("Previous request saved. Ready for the next one.");}catch(issue){toast.error(issue instanceof Error?issue.message:"Outlook opened, but the request could not be saved and cleared");}}finally{preparingRef.current=false;setPending(false);}}
const sectionLabel="t-meta mb-3 font-semibold text-text-secondary";
const suggestions=readiness.suggestions.filter(item=>item!==route.warning);
return (
  <div className="rcc-dispatch" onKeyDownCapture={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!event.repeat&&!(event.target as Element).closest("[role=dialog]")){event.preventDefault();event.stopPropagation();void prepare();}}}>
    <PageHeader eyebrow="Appointment expedite" title="Prepare a clear request." description="Routing follows New York time. Review the email before opening Outlook." actions={
      <Dialog>
        <DialogTrigger asChild><Button variant="outline" size="lg"><Settings2 />Recipients and signature</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>RCC recipients and signature</DialogTitle><DialogDescription>Saved privately to your agent account.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="longIslandEmail">Long Island email</Label><Input id="longIslandEmail" type="email" value={prefs.longIslandEmail} onChange={e => setPrefs({...prefs,longIslandEmail:e.target.value})} /></div>
            <div className="space-y-2"><Label htmlFor="nassauEmail">Nassau email</Label><Input id="nassauEmail" type="email" value={prefs.nassauEmail} onChange={e => setPrefs({...prefs,nassauEmail:e.target.value})} /></div>
            <div className="space-y-2"><Label htmlFor="agentName">Your name</Label><Input id="agentName" value={prefs.name} onChange={e => setPrefs({...prefs,name:e.target.value})} /></div>
            <div className="space-y-2"><Label htmlFor="signature">Sign-off</Label><Input id="signature" value={prefs.signature} onChange={e => setPrefs({...prefs,signature:e.target.value})} /></div>
            <Button onClick={savePrefs}>Save settings</Button>
          </div>
        </DialogContent>
      </Dialog>
    } />
    {previous&&<div className="mt-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-xl bg-secondary px-[18px] py-3.5">
      <div className="min-w-0"><p className="t-caption text-text-secondary">Previous prepared request</p><div className="mt-0.5 flex flex-wrap items-baseline gap-x-3"><span className="t-label num">{previous.payload.account}</span><span className="t-body text-text-secondary">{previous.payload.reason}</span></div></div>
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="lg" onClick={()=>void restoreLast()}>Restore draft</Button><Button variant="outline" size="lg" asChild><a href={outlookLink(previous.draft.to,previous.draft.subject)} target="_blank" rel="noopener noreferrer">Open Outlook <ArrowUpRight /></a></Button><SaveCaseDialog key={previous.id} source={{type:"rcc-handoff",id:previous.id}} initialCustomer={previous.payload.customerName} initialAccount={previous.payload.account} initialSummary={previous.payload.summary} triggerLabel="Save as Case" /></div>
    </div>}
    {notice&&<div role="status" className="t-body mt-4 rounded-xl bg-accent px-4 py-3 text-accent-foreground">{notice}{lastOutlookLink&&<a className="ml-2 font-medium underline" href={lastOutlookLink} target="_blank" rel="noopener noreferrer">Open Outlook <ArrowUpRight className="inline size-4" /></a>}</div>}
    <div className="mt-5 min-[1100px]:hidden"><FilterTabs label="Request view" tabs={viewTabs} value={view} onChange={setView} /></div>
    <div className="mt-9 grid items-start gap-10 min-[1100px]:grid-cols-[minmax(0,.93fr)_minmax(0,1.07fr)] min-[1300px]:gap-16">
      <div className={`space-y-8 ${view==="preview"?"hidden min-[1100px]:block":""}`}>
        <section>
          <h2 className={sectionLabel}>Start from a template</h2>
          <div className="grid gap-3.5">
            {templateGroups.map(group => <div key={group.label}>
              <p className="t-caption mb-1.5 text-text-secondary">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.ids.map(id => { const template=EXPEDITE_TEMPLATES.find(item => item.id===id)!; return <button key={id} type="button" aria-pressed={selectedTemplate===id} onClick={() => { setForm(current => applyExpediteTemplate(current,id));setSelectedTemplate(id);toast.success(template.label+" template applied"); }} className="t-label h-10 rounded-full bg-sheet px-3.5 shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-[background-color,color,box-shadow] duration-[var(--dur-quick)] not-aria-pressed:hover-fine:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-accent aria-pressed:text-primary aria-pressed:shadow-[inset_0_0_0_1px_var(--primary)]">{template.label}</button>; })}
              </div>
            </div>)}
          </div>
        </section>
        <section>
          <h2 className={sectionLabel}>Customer</h2>
          <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
            <Field label="Account number"><Input treatment="quiet" className="num" inputMode="numeric" maxLength={15} placeholder="xxxxx-xxxxxx-xx" value={form.account} onChange={e => patch("account",formatAccount(e.target.value))} /></Field>
            <Field label="Callback number"><Input treatment="quiet" className="num" inputMode="numeric" maxLength={12} placeholder="xxx-xxx-xxxx" value={form.phone} onChange={e => patch("phone",formatPhone(e.target.value))} /></Field>
            <Field label="Customer name" className="sm:col-span-2"><Input treatment="quiet" value={form.customerName} onChange={e => patch("customerName",e.target.value)} /></Field>
          </div>
        </section>
        <section>
          <h2 className={sectionLabel}>Appointment</h2>
          <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
            <Field label="Appointment date"><MendDatePicker treatment="quiet" mode="date" value={form.date} onValueChange={value => patch("date",value)} aria-label="Appointment date" /></Field>
            <Field label="Appointment window"><MendSelect treatment="quiet" value={APPOINTMENT_WINDOWS.includes(form.window as typeof APPOINTMENT_WINDOWS[number])||form.window===CUSTOM_APPOINTMENT_WINDOW?form.window:CUSTOM_APPOINTMENT_WINDOW} onValueChange={value => patch("window",value)} aria-label="Appointment window" options={[...APPOINTMENT_WINDOWS.map(value=>({value,label:value})),{value:CUSTOM_APPOINTMENT_WINDOW,label:"Custom window"}]} /></Field>
            {(form.window===CUSTOM_APPOINTMENT_WINDOW||!APPOINTMENT_WINDOWS.includes(form.window as typeof APPOINTMENT_WINDOWS[number]))&&<Field label="Custom appointment window" className="sm:col-span-2"><Input treatment="quiet" value={form.window===CUSTOM_APPOINTMENT_WINDOW?form.customWindow??"":form.window} onChange={e => {if(form.window===CUSTOM_APPOINTMENT_WINDOW)patch("customWindow",e.target.value);else setForm(current=>({...current,window:CUSTOM_APPOINTMENT_WINDOW,customWindow:e.target.value}));}} placeholder="e.g. 10:00 AM – 1:00 PM" /></Field>}
            <div className="sm:col-span-2"><span className="mb-2 block text-xs font-medium text-text-secondary">Route</span><FilterTabs label="Route" tabs={routeTabs} value={form.teamMode} onChange={value => patch("teamMode",value)} /></div>
          </div>
        </section>
        <section>
          <h2 className={sectionLabel}>Request</h2>
          <div className="grid gap-x-7 gap-y-6">
            <Field label="Reason for expedite"><MendSelect treatment="quiet" value={form.reason} onValueChange={value => patch("reason",value)} placeholder="Select a reason" aria-label="Reason for expedite" options={EXPEDITE_REASONS.map(reason => ({value:reason,label:reason}))} /></Field>
            <Field label="Case summary"><Textarea ref={summaryRef} treatment="quiet" rows={4} value={form.summary} onChange={e => patch("summary",e.target.value)} /></Field>
            <Field label="Action requested"><Textarea treatment="quiet" rows={3} value={form.action} onChange={e => patch("action",e.target.value)} /></Field>
          </div>
        </section>
      </div>
      <aside className={`min-w-0 min-[1100px]:sticky min-[1100px]:top-6 min-[1100px]:-m-0.5 min-[1100px]:max-h-[calc(100dvh-3rem)] min-[1100px]:overflow-auto min-[1100px]:overscroll-contain min-[1100px]:p-0.5 ${view==="compose"?"hidden min-[1100px]:block":""}`}>
        <RouteCard route={route} teamMode={form.teamMode} recipient={recipient} />
        <p className={`${sectionLabel} mt-6`}>Live preview</p>
        <div className="rounded-xl bg-[var(--document)] px-5 py-6 text-[var(--document-foreground)] shadow-[0_0_0_1px_rgba(0,0,0,.07),0_10px_30px_-26px_rgba(0,0,0,.22)] sm:px-7">
          <div className="grid gap-x-3 gap-y-2 text-[13px] sm:grid-cols-[3.5rem_minmax(0,1fr)]">
            <span className="text-[#746f6b]">To</span><span className="break-all">{draft.to||"Set recipient"}</span>
            <span className="text-[#746f6b]">Subject</span><span className="font-medium break-words">{draft.subject}</span>
          </div>
          <div className="mt-6 h-px bg-[#e7e3e0]" />
          <div className="mt-6 overflow-hidden break-words" dangerouslySetInnerHTML={{__html:previewHtml}} />
          <details className="mt-5 text-xs"><summary className="cursor-pointer text-[#746f6b] hover:text-[#282525]">Plain-text version</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6">{draft.plain}</pre></details>
        </div>
        <ReadinessChecklist blockers={readiness.blockers} route={route} values={form} recipient={recipient} attempted={attempted} />
        {suggestions.length>0&&<ul className="mt-3 space-y-1">{suggestions.map(item => <li key={item} className="t-body flex items-start gap-2 text-text-secondary"><span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-status-due" />{item}</li>)}</ul>}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="lg" disabled={pending||!readiness.ready} onClick={prepare}>{pending?"Preparing…":"Open in Outlook"}<ArrowUpRight />{!pending&&<Kbd keys={["mod","Enter"]} className="[@media(hover:none)]:hidden" />}</Button>
          <Button size="lg" variant="outline" onClick={()=>void copyFormatted()}><Clipboard />Copy formatted email</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="lg" variant="ghost">More options<ChevronDown /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" onCloseAutoFocus={event=>{if(focusSummaryRef.current){event.preventDefault();focusSummaryRef.current=false;requestAnimationFrame(()=>summaryRef.current?.focus());}}}>
              <DropdownMenuItem className="min-h-10" onSelect={()=>{focusSummaryRef.current=true;setView("compose");}}>Edit manually</DropdownMenuItem>
              <DropdownMenuItem className="min-h-10" onSelect={downloadHtml}>Download HTML</DropdownMenuItem>
              <DropdownMenuItem className="min-h-10" onSelect={downloadEml}>Download .eml</DropdownMenuItem>
              <DropdownMenuItem className="min-h-10" onSelect={()=>void restoreLast()}>Restore last prepared</DropdownMenuItem>
              <DropdownMenuItem className="min-h-10" onSelect={newRequest}>New request</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p role="status" className="t-caption mt-4 text-text-secondary">{pending?"Preparing…":JSON.stringify(form)!==lastSavedPayload?"Autosaving…":<>Saved, revision <span className="num">{revision}</span></>}</p>
        <p className="t-caption mt-1 text-text-secondary">Ctrl + Enter opens Outlook. This prepares a draft; it does not send an email or confirm an appointment.</p>
      </aside>
    </div>
  </div>
);
}
function Field({label,children,className=""}:{label:string;children:React.ReactNode;className?:string}){return <label className={`block space-y-1.5 ${className}`}><span className="text-xs font-medium text-text-secondary">{label}</span>{children}</label>;}
