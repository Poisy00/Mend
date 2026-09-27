"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { wallTimeToUtc } from "@/lib/follow-ups/time";
import { Button } from "@/components/ui/button";
import { SaveCaseDialog } from "@/components/cases/save-dialog";

type HistoryEvent = { id: string; type: string; createdAt: string };

export function FollowUpDetail({ item, onAction }: { item: FollowUp; onAction: (item: FollowUp, command: FollowUpCommand) => Promise<void> }) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const closed = ["completed", "abandoned", "cancelled"].includes(item.status);

  useEffect(() => {
    let active = true;
    fetch(`/api/follow-ups/${item.id}`).then(response => response.json() as Promise<{ history?: HistoryEvent[] }>).then(data => {
      if (active && Array.isArray(data.history)) setHistory(data.history);
    }).catch(() => {});
    return () => { active = false; };
  }, [item.id, item.revision]);

  return <div className="py-5">
    <p className="text-xs font-medium uppercase tracking-[.09em] text-primary">{item.status.replaceAll("_", " ")}</p>
    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{item.customerName}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
    <dl className="mt-7 grid grid-cols-2 gap-y-5 border-y border-border py-5 text-sm">
      <div><dt className="text-muted-foreground">Account</dt><dd className="mt-1 font-medium">{item.accountNumber}</dd></div>
      <div><dt className="text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{item.phoneNumber}</dd></div>
      <div className="col-span-2"><dt className="text-muted-foreground">Due</dt><dd className="mt-1 font-medium">{new Date(item.dueAt).toLocaleString("en-US", { timeZone: item.sourceTimezone, dateStyle: "medium", timeStyle: "short" })} · {item.sourceTimezone === "Africa/Cairo" ? "Cairo" : "New York"}</dd></div>
    </dl>
    {item.notes && <div className="mt-6"><h3 className="text-sm font-semibold">Context</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.notes}</p></div>}
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
      {!closed && <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-[190px] flex-1 space-y-2 text-sm"><span className="font-medium">Choose a new time · {item.sourceTimezone === "Africa/Cairo" ? "Cairo" : "New York"}</span><input type="datetime-local" value={rescheduleAt} onChange={event => setRescheduleAt(event.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"/></label><Button variant="outline" onClick={() => { try { if (!rescheduleAt) throw new Error("Choose a new time"); void onAction(item, { type: "reschedule", dueAt: wallTimeToUtc(rescheduleAt, item.sourceTimezone) }); } catch (error) { toast.error(error instanceof Error ? error.message : "Choose a valid time"); } }}>Reschedule</Button></div>}
    </div>
    <section className="mt-8 border-t border-border pt-6" aria-label="Follow-up history"><h3 className="text-sm font-semibold">History</h3>
      {history.length ? <ol className="mt-3 space-y-3 border-l border-border pl-4">{history.map(event => <li key={event.id} className="text-sm"><span className="font-medium capitalize">{event.type.replaceAll("_", " ")}</span><span className="ml-2 text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">No history yet.</p>}
    </section>
    <div className="mt-8 border-t border-border pt-6"><SaveCaseDialog source={{ type: "follow-up", id: item.id, status: item.status }} initialCustomer={item.customerName} initialAccount={item.accountNumber} initialSummary={item.reason} /></div>
  </div>;
}
