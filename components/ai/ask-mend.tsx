"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Copy, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MendLink } from "@/components/mend-link";

type Message = { id:string; role:"user"|"assistant"; content:string };
type Thread = { id:string; title:string; model:string|null };

export function AskMend() {
  const pathname=usePathname();
  const [open,setOpen]=useState(false),[connected,setConnected]=useState(false);
  const [threads,setThreads]=useState<Thread[]>([]),[threadId,setThreadId]=useState<string>();
  const [messages,setMessages]=useState<Message[]>([]),[models,setModels]=useState<string[]>([]),[model,setModel]=useState("");
  const [input,setInput]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const bottom=useRef<HTMLDivElement>(null);
  const refresh=useCallback(async()=>{
    const [connectionResponse,threadsResponse]=await Promise.all([fetch("/api/ai/connection"),fetch("/api/ai/threads")]);
    if(!connectionResponse.ok||!threadsResponse.ok)throw new Error("Could not load Ask Mend");
    const status=await connectionResponse.json() as {connection:{status:string}};
    setConnected(status.connection.status==="connected");
    setThreads((await threadsResponse.json() as {threads:Thread[]}).threads);
    if(status.connection.status==="connected"){
      const response=await fetch("/api/ai/models");
      if(response.ok){const available=(await response.json() as {models:string[]}).models;setModels(available);setModel(current=>available.includes(current)?current:available[0]??"");}
    }
  },[]);
  useEffect(()=>{if(!open)return;const timer=setTimeout(()=>{void refresh().catch(e=>setError(e.message));},0);return()=>clearTimeout(timer);},[open,refresh]);
  useEffect(()=>{if(open)bottom.current?.scrollIntoView({behavior:"smooth"});},[messages,open]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="j"){event.preventDefault();setOpen(value=>!value);}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[]);
  async function selectThread(id:string){
    setError(""); const response=await fetch(`/api/ai/threads/${id}`);
    if(!response.ok){setError("Could not load conversation");return;}
    const thread=(await response.json() as {thread:{messages:Message[];model:string|null}}).thread;
    setThreadId(id);setMessages(thread.messages);if(thread.model&&models.includes(thread.model))setModel(thread.model);
  }
  async function removeThread(id:string){
    const response=await fetch(`/api/ai/threads/${id}`,{method:"DELETE"});
    if(!response.ok){setError("Could not delete conversation");return;}
    if(threadId===id){setThreadId(undefined);setMessages([]);}
    setThreads(items=>items.filter(item=>item.id!==id));
  }
  async function send(event:React.FormEvent){
    event.preventDefault();const value=input.trim();if(!value||busy||!connected||!model)return;
    setInput("");setError("");setBusy(true);
    const assistantId=crypto.randomUUID();
    setMessages(items=>[...items,{id:crypto.randomUUID(),role:"user",content:value},{id:assistantId,role:"assistant",content:""}]);
    const segment=pathname.split("/").filter(Boolean);
    const area=["follow-ups","rcc","cases","settings","schedule"].includes(segment[0])?segment[0]:"today";
    const activePanel=area==="rcc"?document.querySelector('[role="tabpanel"][id^="rcc-panel-"]')?.id:undefined;
    const workflow=activePanel?.replace("rcc-panel-","");
    try{
      const response=await fetch("/api/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({threadId,message:value,model,context:{area,route:pathname,...(workflow?{workflow}:{})}})});
      if(!response.ok){const result=await response.json() as {error?:string};throw new Error(result.error??"Ask Mend could not respond");}
      const newId=response.headers.get("x-mend-thread-id");if(newId)setThreadId(newId);
      if(!response.body)throw new Error("No response stream");
      const reader=response.body.getReader(),decoder=new TextDecoder();let responseText="";
      while(true){const {done,value:chunk}=await reader.read();if(done)break;responseText+=decoder.decode(chunk,{stream:true});setMessages(items=>items.map(item=>item.id===assistantId?{...item,content:responseText}:item));}
      responseText+=decoder.decode();
      if(!responseText.trim())throw new Error("The model returned no text. Please try again.");
      void refresh().catch(()=>{});
    }catch(e){setError(e instanceof Error?e.message:"Ask Mend could not respond");setMessages(items=>items.filter(item=>item.id!==assistantId));}
    finally{setBusy(false);}
  }
  return <>
    <Button variant="outline" size="sm" className="gap-2" onClick={()=>setOpen(true)}><Bot className="size-4"/>Ask Mend<span className="hidden text-xs text-muted-foreground lg:inline">⌘J</span></Button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[520px]">
      <SheetHeader className="border-b px-5 py-5"><SheetTitle className="flex items-center gap-2"><Bot className="size-5 text-primary"/>Ask Mend</SheetTitle><SheetDescription>Your workspace assistant</SheetDescription></SheetHeader>
      <div className="flex items-center gap-2 border-b px-5 py-3"><Button size="sm" variant="outline" onClick={()=>{setThreadId(undefined);setMessages([]);setError("");}}><Plus className="size-4"/>New</Button>
        <select aria-label="Model" value={model} disabled={!connected||busy} onChange={e=>setModel(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"><option value="">Choose model</option>{models.map(item=><option key={item} value={item}>{item}</option>)}</select></div>
      {threads.length>0&&<div className="flex gap-2 overflow-x-auto border-b px-5 py-2" aria-label="Recent conversations">{threads.map(item=><div key={item.id} className="flex shrink-0 items-center rounded-md border"><button type="button" onClick={()=>void selectThread(item.id)} className={`max-w-36 truncate px-3 py-2 text-xs ${threadId===item.id?"font-semibold text-primary":""}`} title={item.title}>{item.title}</button><button type="button" onClick={()=>void removeThread(item.id)} aria-label={`Delete ${item.title}`} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="size-3"/></button></div>)}</div>}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {!connected?<div className="rounded-xl border bg-card p-5"><p className="font-medium">Connect ChatGPT to get started</p><p className="mt-2 text-sm text-muted-foreground">Use the authorization button in Settings, then return here.</p><Button asChild variant="outline" className="mt-4" onClick={()=>setOpen(false)}><MendLink href="/settings">Open Settings</MendLink></Button></div>:
        messages.length===0?<div className="pt-10 text-center"><Bot className="mx-auto size-9 text-primary"/><h3 className="mt-4 font-semibold">What can I help with?</h3><p className="mt-2 text-sm text-muted-foreground">Ask about cases, follow-ups, or the RCC workflow.</p></div>:messages.map(item=><div key={item.id} className={`group rounded-xl p-4 text-sm whitespace-pre-wrap break-words ${item.role==="user"?"ml-8 bg-primary text-primary-foreground":"mr-5 border bg-card"}`}><p className="mb-2 text-xs font-semibold opacity-70">{item.role==="user"?"You":"Ask Mend"}</p>{item.content||"Thinking…"}{item.content&&<button type="button" className="mt-2 block opacity-60 hover:opacity-100" aria-label="Copy message" onClick={()=>void navigator.clipboard.writeText(item.content)}><Copy className="size-3.5"/></button>}</div>)}<div ref={bottom}/>
      </div>
      {error&&<p role="alert" className="mx-5 mb-2 text-sm text-destructive">{error}</p>}
      <form onSubmit={send} className="border-t p-5"><label htmlFor="ask-mend-input" className="sr-only">Message Ask Mend</label><textarea id="ask-mend-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} maxLength={8000} disabled={!connected||busy} placeholder="Ask Mend anything about your work…" rows={3} className="w-full resize-none rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"/><div className="mt-2 flex items-center justify-between"><p className="text-xs text-muted-foreground">Shift + Enter for a new line</p><Button size="sm" disabled={!input.trim()||!model||!connected||busy}>{busy?"Working…":<>Send <Send className="size-3.5"/></>}</Button></div></form>
    </SheetContent></Sheet>
  </>;
}
