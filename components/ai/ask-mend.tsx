"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, History, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MendSelect } from "@/components/ui/mend-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MendLink } from "@/components/mend-link";

type Message = { id:string; role:"user"|"assistant"; content:string };
type Thread = { id:string; title:string; model:string|null };

const suggestions = ["Summarise my overdue follow-ups", "Draft an expedite note", "What's my next shift?"];

function MendMark() {
  return <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">M</span>;
}

export function AskMend({ open, onOpenChange, instant = false }: { open: boolean; onOpenChange: (open: boolean) => void; instant?: boolean }) {
  const pathname=usePathname();
  const [connected,setConnected]=useState(false);
  const [threads,setThreads]=useState<Thread[]>([]),[threadId,setThreadId]=useState<string>();
  const [messages,setMessages]=useState<Message[]>([]),[models,setModels]=useState<string[]>([]),[model,setModel]=useState("");
  const [input,setInput]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const scroller=useRef<HTMLDivElement>(null),stick=useRef(true),composer=useRef<HTMLTextAreaElement>(null);
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
  // Follow the stream only while the reader is already near the bottom; never fight a manual scroll.
  useEffect(()=>{const el=scroller.current;if(open&&el&&stick.current)el.scrollTop=el.scrollHeight;},[messages,open]);
  useEffect(()=>{const el=composer.current;if(!el)return;el.style.height="auto";el.style.height=`${Math.min(el.scrollHeight,144)}px`;},[input,open]);
  async function selectThread(id:string){
    setError(""); const response=await fetch(`/api/ai/threads/${id}`);
    if(!response.ok){setError("Could not load conversation");return;}
    const thread=(await response.json() as {thread:{messages:Message[];model:string|null}}).thread;
    stick.current=true;setThreadId(id);setMessages(thread.messages);if(thread.model&&models.includes(thread.model))setModel(thread.model);
  }
  async function removeThread(id:string){
    const response=await fetch(`/api/ai/threads/${id}`,{method:"DELETE"});
    if(!response.ok){setError("Could not delete conversation");return;}
    if(threadId===id){setThreadId(undefined);setMessages([]);}
    setThreads(items=>items.filter(item=>item.id!==id));
  }
  async function send(event:React.FormEvent){
    event.preventDefault();const value=input.trim();if(!value||busy||!connected||!model)return;
    setInput("");setError("");setBusy(true);stick.current=true;
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
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" instant={instant} className="w-full gap-0 border-0 bg-sheet p-0 shadow-overlay sm:max-w-[440px]">
    <SheetHeader className="gap-0.5 px-5 pt-5 pb-4 pr-12"><SheetTitle className="t-heading">Ask Mend</SheetTitle><SheetDescription className="t-caption text-text-secondary">Powered by your ChatGPT account</SheetDescription></SheetHeader>
    <div className="flex items-center gap-2 border-b border-border px-5 pb-3">
      <MendSelect aria-label="Model" value={model} onValueChange={setModel} disabled={!connected||busy} options={models.map(item=>({value:item,label:item}))} placeholder="Choose model" className="h-8 flex-1 rounded-lg px-2.5 text-[13px] data-[size=default]:h-8" />
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" disabled={threads.length===0}><History />Recent</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">{threads.map(item=><div key={item.id} className="flex items-center gap-1"><DropdownMenuItem className="min-w-0 flex-1" onSelect={()=>void selectThread(item.id)}><span className={`truncate ${threadId===item.id?"font-medium text-primary":""}`}>{item.title}</span></DropdownMenuItem><button type="button" onClick={()=>void removeThread(item.id)} aria-label={`Delete ${item.title}`} className="grid size-8 shrink-0 place-items-center rounded-md text-text-muted outline-none hover-fine:text-destructive focus-visible:outline-2 focus-visible:outline-ring"><Trash2 className="size-3.5"/></button></div>)}</DropdownMenuContent></DropdownMenu>
      <Button variant="ghost" size="sm" onClick={()=>{setThreadId(undefined);setMessages([]);setError("");}}><Plus />New</Button>
    </div>
    <div ref={scroller} onScroll={e=>{const el=e.currentTarget;stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<80;}} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5" aria-live="polite">
      {!connected?<div className="py-16 text-center"><h3 className="t-heading">Ask Mend isn&apos;t connected</h3><p className="t-meta mt-1 text-text-secondary">Connect ChatGPT in Settings to use Ask Mend.</p><Button asChild variant="secondary" className="mt-4" onClick={()=>onOpenChange(false)}><MendLink href="/settings">Open Settings</MendLink></Button></div>:
      messages.length===0?<div className="py-16 text-center"><h3 className="t-heading">What can I help with?</h3><p className="t-meta mt-1 text-text-secondary">Ask about your follow-ups, your shift or an RCC request.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{suggestions.map(text=><Button key={text} variant="secondary" size="sm" onClick={()=>{setInput(text);composer.current?.focus();}}>{text}</Button>)}</div></div>:
      messages.map(item=>item.role==="user"
        ?<div key={item.id} className="flex justify-end"><p className="t-body max-w-[85%] rounded-[14px] rounded-br-[4px] bg-secondary px-3.5 py-2.5 whitespace-pre-wrap break-words text-secondary-foreground">{item.content}</p></div>
        :<div key={item.id} className="flex gap-2.5"><MendMark /><p className="t-body min-w-0 flex-1 whitespace-pre-wrap break-words">{item.content||<span className="text-text-secondary">Thinking…</span>}</p></div>)}
    </div>
    {error&&<p role="alert" className="t-meta mx-5 mb-2 text-destructive">{error}</p>}
    <form onSubmit={send} className="px-5 pb-5"><label htmlFor="ask-mend-input" className="sr-only">Message Ask Mend</label>
      <div className="rounded-[12px] bg-secondary shadow-[inset_0_0_0_1px_transparent] focus-within:shadow-[inset_0_0_0_1px_var(--ring)]"><textarea ref={composer} id="ask-mend-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} maxLength={8000} disabled={!connected||busy} placeholder="Ask Mend anything about your work…" rows={1} className="t-body block max-h-36 w-full resize-none bg-transparent px-3.5 pt-3 pb-1 outline-none placeholder:text-text-muted"/>
        <div className="flex items-center justify-end px-2 pb-2"><Button type="submit" size="icon-sm" aria-label="Send message" disabled={!input.trim()||!model||!connected||busy}><ArrowUp /></Button></div></div>
      <p className="t-caption mt-2 text-text-secondary">Enter to send, Shift+Enter for a new line</p></form>
  </SheetContent></Sheet>;
}
