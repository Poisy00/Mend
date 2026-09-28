"use client";
import { MendDatePicker } from "@/components/ui/mend-date-picker";
import { MendSelect } from "@/components/ui/mend-select";
import { useEffect,useMemo,useRef,useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight,Check,ChevronDown,Clipboard,Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";import { Input } from "@/components/ui/input";import { Label } from "@/components/ui/label";import { Textarea } from "@/components/ui/textarea";
import { SaveCaseDialog } from "@/components/cases/save-dialog";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from "@/components/ui/dialog";
import { resolveExpediteRoute } from "@/lib/rcc/expedite-routing";import { assessExpedite } from "@/lib/rcc/expedite-readiness";import { buildExpediteEmail } from "@/lib/rcc/expedite-email";import { copyRichEmail } from "@/lib/rcc/copy-rich-email";import type { ExpediteInput,RccPreferences } from "@/lib/rcc/types";import { DEFAULT_EXPEDITE_ACTION,EXPEDITE_TEMPLATES,EXPEDITE_REASONS,APPOINTMENT_WINDOWS,CUSTOM_APPOINTMENT_WINDOW,applyExpediteTemplate } from "@/lib/rcc/expedite-templates";
import { formatAccount, formatPhone } from "@/lib/rcc/format-identifiers";
import type { SavedDraft } from "@/lib/rcc/initial-state";
const blank:ExpediteInput={teamMode:"auto",account:"",phone:"",customerName:"",date:"",window:APPOINTMENT_WINDOWS[0],customWindow:"",reason:"",summary:"",action:DEFAULT_EXPEDITE_ACTION,scheduled:true};
const templateGroups = [
  { label: "CONNECTIVITY", ids: ["no-internet", "outage", "degradation", "repeat"] },
  { label: "APPOINTMENT / RETENTION", ids: ["missed", "cancel"] },
  { label: "SPECIAL CASES", ids: ["business", "damage"] },
];
type PreviousRequest={id:string;payload:ExpediteInput;draft:{to:string;subject:string};createdAt:string};
const outlookLink=(to:string,subject:string)=>`/outlook-handoff?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}`;
export function ExpediteForm({initialDraft,initialPreferences}:{initialDraft:SavedDraft<ExpediteInput>;initialPreferences:RccPreferences}){const [form,setForm]=useState<ExpediteInput>(()=>initialDraft?{...blank,...initialDraft.payload,account:formatAccount(initialDraft.payload.account),phone:formatPhone(initialDraft.payload.phone)}:blank),[prefs,setPrefs]=useState<RccPreferences>(initialPreferences),[revision,setRevision]=useState(initialDraft?.revision??0),[pending,setPending]=useState(false),[notice,setNotice]=useState(""),[lastOutlookLink,setLastOutlookLink]=useState(""),[previous,setPrevious]=useState<PreviousRequest|null>(null),[view,setView]=useState<"compose"|"preview">("compose");
const [templateOpen,setTemplateOpen]=useState(false),[selectedTemplate,setSelectedTemplate]=useState<string | null>(()=>initialDraft?EXPEDITE_TEMPLATES.find(item=>item.reason===initialDraft.payload.reason&&item.summary===initialDraft.payload.summary)?.id??null:null);
const [lastSavedPayload,setLastSavedPayload]=useState(()=>JSON.stringify(initialDraft?{...blank,...initialDraft.payload}:blank));
const summaryRef=useRef<HTMLTextAreaElement>(null);
const preparingRef=useRef(false);
const saveQueue=useRef<Promise<unknown>>(Promise.resolve());
const latest=useRef({revision:initialDraft?.revision??0,payload:JSON.stringify(initialDraft?{...blank,...initialDraft.payload}:blank)});
function patch<K extends keyof ExpediteInput>(key:K,value:ExpediteInput[K]){setForm(current=>({...current,[key]:value}));}
function save(payload:ExpediteInput):Promise<number>{const serialized=JSON.stringify(payload);const send=async()=>{if(serialized===latest.current.payload)return latest.current.revision;const response=await fetch("/api/rcc/drafts/expedite",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({payload,expectedRevision:latest.current.revision})});const data:any=await response.json();if(!response.ok)throw new Error(data.error??"Unable to save draft");latest.current={revision:data.revision,payload:serialized};setLastSavedPayload(serialized);setRevision(data.revision);return data.revision as number;};const result=saveQueue.current.then(send,send);saveQueue.current=result;return result;}
useEffect(()=>{if(JSON.stringify(form)===latest.current.payload)return;const timer=setTimeout(()=>{if(!preparingRef.current)void save(form).catch(()=>toast.error("Draft could not be saved"));},800);return()=>clearTimeout(timer);},[form]);
useEffect(()=>{let active=true;void fetch("/api/rcc/handoffs?workflow=expedite").then(response=>response.ok?response.json():null).then(data=>{const result=data as {handoff:PreviousRequest|null}|null;if(active&&result?.handoff)setPrevious(current=>current??result.handoff);}).catch(()=>{});return()=>{active=false;};},[]);
const route=useMemo(()=>resolveExpediteRoute(form,new Date()),[form]);const readiness=assessExpedite(form,prefs,route);const draft=buildExpediteEmail(form,prefs,route);
const previewHtml=draft.html.split("<!--StartFragment-->")[1]?.split("<!--EndFragment-->")[0] ?? "";
async function savePrefs(){const response=await fetch("/api/rcc/preferences",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(prefs)});if(response.ok)toast.success("Recipients and signature saved");else toast.error("Could not save settings");}
function downloadFile(contents:string,type:string,extension:string){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`Expedite-${form.account||"request"}.${extension}`;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadHtml(){downloadFile(draft.html,"text/html;charset=utf-8","html");}
function downloadEml(){const body=[`To: ${draft.to}`,`Subject: ${draft.subject}`,"X-Unsent: 1","MIME-Version: 1.0","Content-Type: text/html; charset=UTF-8","","",draft.html].join("\r\n");downloadFile(body,"message/rfc822","eml");}
function newRequest(){setForm({...blank});setSelectedTemplate(null);setTemplateOpen(false);setNotice("");setView("compose");toast.success("New request ready");}
async function restoreLast(){try{const response=await fetch("/api/rcc/handoffs?workflow=expedite");if(!response.ok)throw new Error("Could not load the last request");const result=await response.json() as {handoff?:PreviousRequest|null};if(!result.handoff){toast.message("No prepared request to restore yet");return;}setPrevious(result.handoff);setForm({...blank,...result.handoff.payload,account:formatAccount(result.handoff.payload.account),phone:formatPhone(result.handoff.payload.phone)});setSelectedTemplate(EXPEDITE_TEMPLATES.find(item=>item.reason===result.handoff?.payload.reason&&item.summary===result.handoff?.payload.summary)?.id??null);setTemplateOpen(false);setNotice("");setView("compose");toast.success("Previous request restored for editing");}catch(error){toast.error(error instanceof Error?error.message:"Could not restore request");}}
async function copyFormatted(){try{await copyRichEmail(draft);toast.success("Formatted email copied — paste into Outlook");return true;}catch{setNotice("Formatted copying was blocked. Download the HTML or .eml from More options.");toast.error("Formatted email could not be copied");return false;}}
async function prepare(){if(preparingRef.current)return;if(!readiness.ready){setView("compose");toast.error("Complete the required items before opening Outlook");return;}preparingRef.current=true;const prepared={...form},message=draft;const popup=window.open("about:blank","_blank");if(popup)popup.opener=null;setPending(true);setNotice("");const link=outlookLink(message.to,message.subject);setLastOutlookLink(link);try{const copied=await copyFormatted();if(popup)popup.location.replace(link);setNotice(popup?(copied?"Formatted email copied. Paste it into the Outlook message body.":"Outlook opened, but formatted copying was blocked. Download the HTML or .eml from More options."):(copied?"Formatted email copied. Your browser blocked the new tab; use the Outlook link below.":"Your browser blocked the Outlook tab and formatted copying. Use the link below and download the HTML or .eml from More options."));try{const draftRevision=await save(prepared);const response=await fetch("/api/rcc/handoffs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workflow:"expedite",draftRevision})});const data:any=await response.json();if(!response.ok)throw new Error(data.error??"Unable to save prepared request");setPrevious({id:data.handoff.id,payload:prepared,draft:{to:message.to,subject:message.subject},createdAt:data.handoff.createdAt});await save({...blank});setForm({...blank});setSelectedTemplate(null);setTemplateOpen(false);setView("compose");toast.success("Previous request saved. Ready for the next one.");}catch(issue){toast.error(issue instanceof Error?issue.message:"Outlook opened, but the request could not be saved and cleared");}}finally{preparingRef.current=false;setPending(false);}}
return (
  <div className="rcc-dispatch" onKeyDownCapture={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&!event.repeat&&!(event.target as Element).closest("[role=dialog]")){event.preventDefault();event.stopPropagation();void prepare();}}}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(1.8rem,2.3vw,2.3rem)] font-semibold leading-tight tracking-[-.045em] text-balance">Prepare a clear request.</h1>
        <p className="mt-2 max-w-[38rem] text-sm leading-6 text-[var(--text-secondary)] text-pretty">Routing follows New York time. Review the email before opening Outlook.</p>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button variant="ghost" className="text-[var(--text-secondary)] hover:text-foreground"><Settings2 />Recipients · {route.name}</Button></DialogTrigger>
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
    </div>
    {previous&&<div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-accent/30 px-5 py-4">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Previous prepared request</p><p className="mt-1 text-sm font-medium">{previous.payload.account} · {previous.payload.reason}</p></div>
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={()=>void restoreLast()}>Restore draft</Button><Button variant="ghost" size="sm" asChild><a href={outlookLink(previous.draft.to,previous.draft.subject)} target="_blank" rel="noopener noreferrer">Open Outlook <ArrowUpRight /></a></Button><SaveCaseDialog key={previous.id} source={{type:"rcc-handoff",id:previous.id}} initialCustomer={previous.payload.customerName} initialAccount={previous.payload.account} initialSummary={previous.payload.summary} triggerLabel="Save as Case" /></div>
    </div>}
    {notice&&<div role="status" className="mt-4 rounded-md bg-accent/70 p-4 text-sm">{notice}{lastOutlookLink&&<a className="ml-2 font-medium text-primary underline" href={lastOutlookLink} target="_blank" rel="noopener noreferrer">Open Outlook <ArrowUpRight className="inline size-4" /></a>}</div>}
    <div className="mt-5 flex gap-2 min-[1100px]:hidden">
      <Button variant={view==="compose"?"secondary":"ghost"} onClick={() => setView("compose")}>Compose</Button>
      <Button variant={view==="preview"?"secondary":"ghost"} onClick={() => setView("preview")}>Preview</Button>
    </div>
    <div className="mt-9 grid items-start gap-10 min-[1100px]:grid-cols-[minmax(0,.93fr)_minmax(0,1.07fr)] min-[1300px]:gap-16">
      <div className={view==="preview"?"hidden min-[1100px]:block":""}>
        <p className="mb-6 text-[11px] font-semibold tracking-[.12em] text-[var(--text-secondary)]">REQUEST DETAILS</p>
        <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
          <Field label="Account number"><Input treatment="quiet" inputMode="numeric" maxLength={15} placeholder="xxxxx-xxxxxx-xx" value={form.account} onChange={e => patch("account",formatAccount(e.target.value))} /></Field>
          <Field label="Callback number"><Input treatment="quiet" inputMode="numeric" maxLength={12} placeholder="xxx-xxx-xxxx" value={form.phone} onChange={e => patch("phone",formatPhone(e.target.value))} /></Field>
          <Field label="Customer name" className="sm:col-span-2"><Input treatment="quiet" value={form.customerName} onChange={e => patch("customerName",e.target.value)} /></Field>
          <Field label="Appointment date"><MendDatePicker treatment="quiet" mode="date" value={form.date} onValueChange={value => patch("date",value)} aria-label="Appointment date" /></Field>
          <Field label="Appointment window"><MendSelect treatment="quiet" value={APPOINTMENT_WINDOWS.includes(form.window as typeof APPOINTMENT_WINDOWS[number])||form.window===CUSTOM_APPOINTMENT_WINDOW?form.window:CUSTOM_APPOINTMENT_WINDOW} onValueChange={value => patch("window",value)} aria-label="Appointment window" options={[...APPOINTMENT_WINDOWS.map(value=>({value,label:value})),{value:CUSTOM_APPOINTMENT_WINDOW,label:"Custom window"}]} /></Field>
          {(form.window===CUSTOM_APPOINTMENT_WINDOW||!APPOINTMENT_WINDOWS.includes(form.window as typeof APPOINTMENT_WINDOWS[number]))&&<Field label="Custom appointment window"><Input treatment="quiet" value={form.window===CUSTOM_APPOINTMENT_WINDOW?form.customWindow??"":form.window} onChange={e => {if(form.window===CUSTOM_APPOINTMENT_WINDOW)patch("customWindow",e.target.value);else setForm(current=>({...current,window:CUSTOM_APPOINTMENT_WINDOW,customWindow:e.target.value}));}} placeholder="e.g. 10:00 AM – 1:00 PM" /></Field>}
          <Field label="Route"><MendSelect treatment="quiet" value={form.teamMode} onValueChange={value => patch("teamMode",value as ExpediteInput["teamMode"])} aria-label="Route" options={[{value:"auto",label:"Automatic"},{value:"long-island",label:"Long Island"},{value:"nassau",label:"Nassau"}]} /></Field>
          <Field label="Reason for expedite"><MendSelect treatment="quiet" value={form.reason} onValueChange={value => patch("reason",value)} placeholder="Select a reason" aria-label="Reason for expedite" options={EXPEDITE_REASONS.map(reason => ({value:reason,label:reason}))} /></Field>
          <Field label="Case summary" className="sm:col-span-2"><Textarea ref={summaryRef} treatment="quiet" rows={4} value={form.summary} onChange={e => patch("summary",e.target.value)} /></Field>
          <Field label="Action requested" className="sm:col-span-2"><Textarea treatment="quiet" rows={3} value={form.action} onChange={e => patch("action",e.target.value)} /></Field>
        </div>
        <div className="mt-8">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Case template</p>
          <button type="button" aria-expanded={templateOpen} aria-controls="rcc-template-browser" onClick={() => setTemplateOpen(open => !open)} className="group mt-1 flex min-h-11 w-full items-center justify-between gap-4 border-b border-[var(--border-subtle)] text-left transition-[border-color,color] duration-150 hover:border-[var(--text-secondary)] focus-visible:border-[var(--focus-ring)] focus-visible:outline-none">
            <span className="font-medium">{selectedTemplate ? EXPEDITE_TEMPLATES.find(item => item.id===selectedTemplate)?.label : "Choose a template"}</span>
            <span className="shrink-0 text-sm text-[var(--text-secondary)] group-hover:text-foreground">{templateOpen ? "Close" : selectedTemplate ? "Change" : "Browse templates"} <ChevronDown className={`ml-1 inline size-4 transition-transform duration-200 ${templateOpen?"rotate-180":""}`} /></span>
          </button>
          <div id="rcc-template-browser" data-open={templateOpen} className="rcc-template-reveal" inert={!templateOpen}>
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-5 pt-5 sm:grid-cols-2">
                {templateGroups.map(group => <div key={group.label}>
                  <p className="mb-1 text-[11px] font-semibold tracking-[.08em] text-[var(--text-secondary)]">{group.label}</p>
                  {group.ids.map(id => { const template=EXPEDITE_TEMPLATES.find(item => item.id===id)!; return <button key={id} type="button" aria-pressed={selectedTemplate===id} onClick={() => { setForm(current => applyExpediteTemplate(current,id));setSelectedTemplate(id);setTemplateOpen(false);toast.success(template.label+" template applied"); }} className="flex min-h-10 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] aria-pressed:font-semibold aria-pressed:text-primary">{template.label}{selectedTemplate===id&&<Check className="size-4" />}</button>; })}
                </div>)}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-7 text-xs leading-5 text-[var(--text-secondary)]">{route.name} · {route.beforeCutoff?"Before":"After"} 3:00 PM ET cutoff{route.warning ? ` · ${route.warning}` : ""}</p>
      </div>
      <aside className={view==="compose"?"hidden min-[1100px]:block":""}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold tracking-[.12em] text-[var(--text-secondary)]">LIVE PREVIEW</p>
          <span role="status" className="text-xs text-[var(--text-secondary)] tabular-nums">{pending?"Preparing…":JSON.stringify(form)!==lastSavedPayload?"Autosaving…":`Saved · revision ${revision}`}</span>
        </div>
        <div className="mt-5 rounded-xl bg-[var(--document)] px-5 py-6 text-[var(--document-foreground)] shadow-[0_0_0_1px_rgba(0,0,0,.07),0_10px_30px_-26px_rgba(0,0,0,.22)] sm:px-7">
          <div className="grid gap-x-3 gap-y-2 text-[13px] sm:grid-cols-[3.5rem_minmax(0,1fr)]">
            <span className="text-[#746f6b]">To</span><span className="break-all">{draft.to||"Set recipient"}</span>
            <span className="text-[#746f6b]">Subject</span><span className="font-medium break-words">{draft.subject}</span>
          </div>
          <div className="mt-6 h-px bg-[#e7e3e0]" />
          <div className="mt-6 overflow-hidden break-words" dangerouslySetInnerHTML={{__html:previewHtml}} />
          <details className="mt-5 text-xs"><summary className="cursor-pointer text-[#746f6b] hover:text-[#282525]">Plain-text version</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6">{draft.plain}</pre></details>
        </div>
        <div className="mt-5 space-y-1">{readiness.blockers.map(item => <p key={item} className="text-sm text-destructive">• {item}</p>)}{readiness.suggestions.filter(item=>item!==route.warning).map(item => <p key={item} className="text-sm text-[var(--text-secondary)]">• {item}</p>)}</div>
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3">
          <Button className="min-h-10 px-5" disabled={pending||!readiness.ready} onClick={prepare}>{pending?"Preparing…":"Open in Outlook"}<ArrowUpRight /></Button>
          <Button variant="ghost" onClick={()=>void copyFormatted()}><Clipboard />Copy formatted email</Button>
          <Button variant="ghost" onClick={()=>{setView("compose");requestAnimationFrame(()=>summaryRef.current?.focus());}}>Edit manually</Button>
        </div>
        <details className="mt-2 text-sm text-[var(--text-secondary)]"><summary className="w-fit cursor-pointer rounded px-2 py-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">More options</summary><div className="mt-1 flex flex-wrap gap-x-1"><Button variant="ghost" onClick={downloadHtml}>Download HTML</Button><Button variant="ghost" onClick={downloadEml}>Download .eml</Button><Button variant="ghost" onClick={()=>void restoreLast()}>Restore last prepared</Button><Button variant="ghost" onClick={newRequest}>New request</Button></div></details>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Ctrl + Enter opens Outlook. This prepares a draft; it does not send an email or confirm an appointment.</p>
      </aside>
    </div>
  </div>
);
}
function Field({label,children,className=""}:{label:string;children:React.ReactNode;className?:string}){return <label className={`block space-y-1.5 ${className}`}><span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>{children}</label>;}
