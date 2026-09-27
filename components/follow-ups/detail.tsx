"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { wallTimeToUtc } from "@/lib/follow-ups/time";
import { Button } from "@/components/ui/button";
import { SaveCaseDialog } from "@/components/cases/save-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MendSelect } from "@/components/ui/mend-select";
import { MendDatePicker } from "@/components/ui/mend-date-picker";

type HistoryEvent = { id: string; type: string; createdAt: string };

function localInput(instant:string|null,zone:FollowUp["sourceTimezone"]){if(!instant)return "";const parts=new Intl.DateTimeFormat("en-US",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(instant));const get=(part:string)=>parts.find(item=>item.type===part)?.value??"";return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;}
export function FollowUpDetail({ item, onAction, onSaveProfile }: { item: FollowUp; onAction: (item: FollowUp, command: FollowUpCommand) => Promise<void>;onSaveProfile:(item:FollowUp,profile:Record<string,unknown>)=>Promise<boolean> }) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const closed = ["completed", "abandoned", "cancelled"].includes(item.status);

  useEffect(() => {
    let active = true;
    fetch(`/api/follow-ups/${item.id}`).then(response => response.json() as Promise<{ history?: HistoryEvent[] }>).then(data => {
      if (active && Array.isArray(data.history)) setHistory(data.history);
    }).catch(() => {});
    return () => { active = false; };
  }, [item.id, item.revision]);

  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);try{const data=new FormData(event.currentTarget);const start=String(data.get("appointmentStart")??"");const end=String(data.get("appointmentEnd")??"");const profile={customerName:String(data.get("customerName")??""),accountNumber:String(data.get("accountNumber")??""),phoneNumber:String(data.get("phoneNumber")??""),caseNumber:String(data.get("caseNumber")??""),reason:String(data.get("reason")??""),priority:String(data.get("priority")??"normal"),dueAt:item.dueAt,sourceTimezone:item.sourceTimezone,notes:String(data.get("notes")??""),promise:String(data.get("promise")??""),completionCondition:String(data.get("completionCondition")??""),appointmentStartUtc:start?wallTimeToUtc(start,item.sourceTimezone):null,appointmentEndUtc:end?wallTimeToUtc(end,item.sourceTimezone):null};if(await onSaveProfile(item,profile))setEditing(false);}catch(error){toast.error(error instanceof Error?error.message:"Could not save profile");}finally{setSaving(false);}}

  return <div className="py-5">
    <p className="text-xs font-medium uppercase tracking-[.09em] text-primary">{item.status.replaceAll("_", " ")}</p>
    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{item.customerName}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
    <dl className="mt-7 grid grid-cols-2 gap-y-5 border-y border-border py-5 text-sm">
      <div><dt className="text-muted-foreground">Account</dt><dd className="mt-1 font-medium">{item.accountNumber}</dd></div>
      <div><dt className="text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{item.phoneNumber}</dd></div>
      <div className="col-span-2"><dt className="text-muted-foreground">Due</dt><dd className="mt-1 font-medium">{new Date(item.dueAt).toLocaleString("en-US", { timeZone: item.sourceTimezone, dateStyle: "medium", timeStyle: "short" })} · {item.sourceTimezone === "Africa/Cairo" ? "Cairo" : "New York"}</dd></div>
    </dl>
    {(item.caseNumber||item.promise||item.completionCondition||item.appointmentStartUtc)&&<dl className="mt-5 space-y-3 text-sm">{item.caseNumber&&<div><dt className="text-muted-foreground">Case</dt><dd>{item.caseNumber}</dd></div>}{item.promise&&<div><dt className="text-muted-foreground">Promise</dt><dd>{item.promise}</dd></div>}{item.completionCondition&&<div><dt className="text-muted-foreground">Complete when</dt><dd>{item.completionCondition}</dd></div>}{item.appointmentStartUtc&&<div><dt className="text-muted-foreground">Appointment</dt><dd>{new Date(item.appointmentStartUtc).toLocaleString("en-US",{timeZone:item.sourceTimezone,dateStyle:"medium",timeStyle:"short"})}{item.appointmentEndUtc?` – ${new Date(item.appointmentEndUtc).toLocaleTimeString("en-US",{timeZone:item.sourceTimezone,timeStyle:"short"})}`:""}</dd></div>}</dl>}
    {item.notes && <div className="mt-6"><h3 className="text-sm font-semibold">Context</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.notes}</p></div>}
    <div className="mt-6"><Button variant="outline" size="sm" onClick={()=>setEditing(value=>!value)}>{editing?"Close profile":"Edit profile"}</Button>{editing&&<form key={`${item.id}-${item.revision}`} onSubmit={save} className="mt-4 grid gap-3 rounded-lg border border-border p-4"><label className="text-sm">Customer name<Input name="customerName" defaultValue={item.customerName}/></label><label className="text-sm">Account number<Input name="accountNumber" required defaultValue={item.accountNumber}/></label><label className="text-sm">Phone number<Input name="phoneNumber" required defaultValue={item.phoneNumber}/></label><label className="text-sm">Case number<Input name="caseNumber" defaultValue={item.caseNumber}/></label><label className="text-sm">Reason<Input name="reason" required defaultValue={item.reason}/></label><label className="text-sm">Priority<MendSelect name="priority" defaultValue={item.priority} options={[{value:"normal",label:"Normal"},{value:"urgent",label:"Urgent"}]} /></label><label className="text-sm">Context<Textarea name="notes" defaultValue={item.notes}/></label><label className="text-sm">Promise<Textarea name="promise" defaultValue={item.promise}/></label><label className="text-sm">Complete when<Textarea name="completionCondition" defaultValue={item.completionCondition}/></label><label className="text-sm">Appointment starts · {item.sourceTimezone==="Africa/Cairo"?"Cairo":"New York"}<MendDatePicker mode="datetime" name="appointmentStart" defaultValue={localInput(item.appointmentStartUtc,item.sourceTimezone)}/></label><label className="text-sm">Appointment ends<MendDatePicker mode="datetime" name="appointmentEnd" defaultValue={localInput(item.appointmentEndUtc,item.sourceTimezone)}/></label><Button disabled={saving} type="submit">{saving?"Saving…":"Save profile"}</Button></form>}</div>
    <div className="mt-8"><h3 className="mb-3 text-sm font-semibold">Next action</h3>
      {closed ? <Button variant="outline" onClick={() => void onAction(item, { type: "restore" })}>Restore follow-up</Button> : <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => void onAction(item, { type: "resolved" })}>Resolved</Button>
        <Button variant="outline" onClick={() => void onAction(item, { type: "follow_up" })}>Follow up +30m</Button>
        <Button variant="outline" onClick={() => void onAction(item, { type: "busy" })}>Busy +10m</Button>
        <Button variant="outline" onClick={() => void onAction(item, { type: "no_answer" })}>No answer</Button>
        <Button variant="outline" onClick={() => void onAction(item, { type: "escalation_required" })}>Escalation +30m</Button>
        <Button variant="outline" onClick={() => void onAction(item, { type: "wrong_number" })}>Wrong number</Button>
        {item.status === "voicemail_required" && <><Button variant="outline" onClick={() => void onAction(item, { type: "confirm_voicemail", voicemailLeft: true })}>Voicemail left</Button><Button variant="outline" onClick={() => void onAction(item, { type: "confirm_voicemail", voicemailLeft: false })}>No voicemail</Button></>}
        <Button variant="ghost" onClick={() => void onAction(item, { type: "cancel" })}>Cancel</Button>
      </div>}
      {!closed && <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-[190px] flex-1 space-y-2 text-sm"><span className="font-medium">Choose a new time · {item.sourceTimezone === "Africa/Cairo" ? "Cairo" : "New York"}</span><MendDatePicker mode="datetime" value={rescheduleAt} onValueChange={setRescheduleAt}/></label><Button variant="outline" onClick={() => { try { if (!rescheduleAt) throw new Error("Choose a new time"); void onAction(item, { type: "reschedule", dueAt: wallTimeToUtc(rescheduleAt, item.sourceTimezone) }); } catch (error) { toast.error(error instanceof Error ? error.message : "Choose a valid time"); } }}>Reschedule</Button></div>}
    </div>
    <section className="mt-8 border-t border-border pt-6" aria-label="Follow-up history"><h3 className="text-sm font-semibold">History</h3>
      {history.length ? <ol className="mt-3 space-y-3 border-l border-border pl-4">{history.map(event => <li key={event.id} className="text-sm"><span className="font-medium capitalize">{event.type.replaceAll("_", " ")}</span><span className="ml-2 text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">No history yet.</p>}
    </section>
    <div className="mt-8 border-t border-border pt-6"><SaveCaseDialog source={{ type: "follow-up", id: item.id, status: item.status }} initialCustomer={item.customerName} initialAccount={item.accountNumber} initialSummary={item.reason} /></div>
  </div>;
}
