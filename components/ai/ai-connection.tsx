"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Pending = { status:string; userCode?:string; verificationUrl?:string; expiresAt?:string; interval?:number; retryAfter?:number; message?:string };
type Connection = { status:string; accountLabel?:string|null };

export function AIConnection() {
  const [connection,setConnection] = useState<Connection>({status:"loading"});
  const [pending,setPending] = useState<Pending|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/ai/connection",{cache:"no-store"});
    if (!response.ok) throw new Error("Could not load ChatGPT connection");
    const data = await response.json() as {connection:Connection; pending:Pending|null};
    setConnection(data.connection); setPending(data.pending?.status==="pending"?data.pending:null);
  },[]);
  useEffect(() => { const timer=setTimeout(()=>{void refresh().catch(e=>setError(e.message));},0);return()=>clearTimeout(timer); },[refresh]);
  useEffect(() => {
    if (!pending || connection.status==="connected") return;
    const timer = setTimeout(async () => {
      try {
        const response=await fetch("/api/ai/connection",{method:"PATCH"});
        const result=await response.json() as Pending;
        if(result.status==="connected") {setPending(null);await refresh();}
        else if(result.status==="pending")setPending(previous=>previous?{...previous,retryAfter:result.retryAfter}:null);
        else if(result.status==="expired"||result.status==="cancelled") {setPending(null);setError("Authorization expired. Start again.");}
        else setError(result.message??"Could not check authorization");
      } catch { setError("Could not check authorization. Retrying…"); }
    },Math.max(5,pending.retryAfter??pending.interval??5)*1000);
    return () => clearTimeout(timer);
  },[pending,connection.status,refresh]);
  async function action(method:"POST"|"DELETE",mode?:string) {
    setBusy(true);setError("");
    try {
      const response=await fetch(`/api/ai/connection${mode?`?mode=${mode}`:""}`,{method});
      const data=await response.json() as Pending & {error?:string};
      if(!response.ok)throw new Error(data.error??"Connection request failed");
      if(method==="POST")setPending(data);
      else {setPending(null);await refresh();}
    } catch(e) {setError(e instanceof Error?e.message:"Connection request failed");}
    finally {setBusy(false);}
  }
  return <section className="mt-10 border-t border-border pt-7" aria-labelledby="chatgpt-connection">
    <h2 id="chatgpt-connection" className="text-xl font-semibold">Ask Mend · ChatGPT</h2>
    <p className="mt-2 text-sm text-muted-foreground">Connect your ChatGPT account to use Ask Mend in this workspace. Your conversation and connection are private to your Mend account.</p>
    {connection.status==="connected"?<div className="mt-4 space-y-3"><p className="text-sm">Connected{connection.accountLabel?` as ${connection.accountLabel}`:""}.</p><Button variant="outline" disabled={busy} onClick={()=>void action("DELETE","disconnect")}>Disconnect ChatGPT</Button></div>:
      pending?<div className="mt-4 space-y-3 rounded-xl border bg-card p-5"><p className="text-sm">Open the authorization page, sign in to ChatGPT, and enter this code:</p>
        <p className="font-mono text-2xl font-semibold tracking-widest" aria-label={`Authorization code ${pending.userCode}`}>{pending.userCode}</p>
        {pending.verificationUrl&&<Button asChild><a href={pending.verificationUrl} target="_blank" rel="noopener noreferrer">Open ChatGPT authorization</a></Button>}
        <p className="text-xs text-muted-foreground">Checking for approval automatically. Expires {pending.expiresAt?new Date(pending.expiresAt).toLocaleTimeString():"soon"}.</p>
        <Button variant="outline" disabled={busy} onClick={()=>void action("DELETE","cancel")}>Cancel</Button></div>:
      <Button className="mt-4" disabled={busy||connection.status==="loading"} onClick={()=>void action("POST")}>{busy?"Connecting…":"Connect ChatGPT"}</Button>}
    {error&&<p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
  </section>;
}
