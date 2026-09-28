"use client";

import { FormEvent, useRef, useState } from "react";
import { MendLink as Link } from "@/components/mend-link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { callbackPresetWallTime, wallDateTime, wallTimeToUtc } from "@/lib/follow-ups/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MendSelect } from "@/components/ui/mend-select";
import { MendDatePicker } from "@/components/ui/mend-date-picker";
import { FOLLOW_UP_REASONS, FOLLOW_UP_WINDOWS, GO_BACK_ISSUES, followUpRecipe, needsTechnicianWindow } from "@/lib/follow-ups/templates";
import { formatAccount, formatPhone } from "@/lib/rcc/format-identifiers";

function appointmentEndLabel(value: string) {
  const time = value.split("T")[1];
  if (!time) return "the appointment window";
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
type Zone = "Africa/Cairo" | "America/New_York";
type Draft = { fields: Record<string, string>; zone: Zone };
const callbackPresets = [{value:"30",label:"In 30 minutes"},{value:"60",label:"In 1 hour"},{value:"120",label:"In 2 hours"},{value:"custom",label:"Custom time"}];

export function FollowUpForm({ initialDraft }: { initialDraft: { payload: Draft; revision: number } | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const draftRevision = useRef(initialDraft?.revision ?? 0);
  const draftQueue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<number | undefined>(undefined);
  const [zone, setZone] = useState<Zone>(initialDraft?.payload.zone ?? "Africa/Cairo");
  const [reason, setReason] = useState(initialDraft?.payload.fields.reason ?? FOLLOW_UP_REASONS[0]);
  const [notes,setNotes] = useState(initialDraft?.payload.fields.notes ?? "");
  const [promise,setPromise] = useState(initialDraft?.payload.fields.promise ?? "");
  const [completion,setCompletion] = useState(initialDraft?.payload.fields.completionCondition ?? "");
  const [windowPreset,setWindowPreset] = useState(initialDraft?.payload.fields.windowPreset ?? "");
  const [callbackPreset,setCallbackPreset] = useState(initialDraft?.payload.fields.callbackPreset ?? "custom");
  const [goBackIssue,setGoBackIssue] = useState(initialDraft?.payload.fields.goBackIssue ?? "");
  const [etaRaised,setEtaRaised] = useState(initialDraft?.payload.fields.etaRaised === "true");
  const [priority, setPriority] = useState(initialDraft?.payload.fields.priority ?? "normal");
  const [dates, setDates] = useState({ dueAt: initialDraft?.payload.fields.dueAt ?? "", appointmentStart: initialDraft?.payload.fields.appointmentStart ?? "", appointmentEnd: initialDraft?.payload.fields.appointmentEnd ?? "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function currentDraft(nextZone: Zone = zone): Draft {
    const fields = formRef.current ? Object.fromEntries(new FormData(formRef.current).entries()) as Record<string, string> : {};
    return { fields, zone: nextZone };
  }

  function saveDraft(draft: Draft) {
    const send = async () => {
      const response = await fetch("/api/follow-ups/draft", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ payload: draft, expectedRevision: draftRevision.current }) });
      const data = await response.json() as { revision?: number; error?: string };
      if (!response.ok || data.revision === undefined) throw new Error(data.error ?? "Unable to save draft");
      draftRevision.current = data.revision;
    };
    draftQueue.current = draftQueue.current.then(send, send);
    return draftQueue.current;
  }

  function scheduleDraft(nextZone: Zone = zone) {
    if (pending) return;
    window.clearTimeout(timer.current);
    const snapshot = currentDraft(nextZone);
    timer.current = window.setTimeout(() => { void saveDraft(snapshot).catch(() => toast.error("Follow-up draft could not be saved")); }, 700);
  }

  function chooseReason(value: string) {
    const recipe = followUpRecipe(value, appointmentEndLabel(dates.appointmentEnd));
    setReason(value); setNotes(recipe.context); setPromise(recipe.promise); setCompletion(recipe.completion);
    setGoBackIssue(""); setEtaRaised(false);
    setPriority(recipe.priority);
    setCallbackPreset("custom");
    setDates(current => ({ ...current, dueAt: callbackPresetWallTime(recipe.minutes, zone) }));
    window.requestAnimationFrame(() => scheduleDraft());
  }
  function chooseCallbackPreset(value: string) {
    setCallbackPreset(value);
    if (value !== "custom") setDates(current => ({ ...current, dueAt: callbackPresetWallTime(Number(value), zone) }));
    window.requestAnimationFrame(() => scheduleDraft());
  }
  function chooseWindow(value: string) {
    setWindowPreset(value);
    const selected = FOLLOW_UP_WINDOWS.find(window => window.value === value);
    if (selected) {
      const date = dates.appointmentStart.split("T")[0] || wallDateTime(new Date(), zone).split("T")[0];
      const nextStart = `${date}T${selected.start}`, nextEnd = `${date}T${selected.end}`;
      setDates(current => ({ ...current, appointmentStart: nextStart, appointmentEnd: nextEnd }));
      if (reason === "Make sure technician arrived" || reason === "Technician missed appointment window") setNotes(followUpRecipe(reason, appointmentEndLabel(nextEnd)).context);
    }
    window.requestAnimationFrame(() => scheduleDraft());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    window.clearTimeout(timer.current);
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const techWindow = needsTechnicianWindow(reason);
    if (techWindow && (!dates.appointmentStart || !dates.appointmentEnd)) { setError("Choose the technician appointment date and window."); setPending(false); return; }
    if (reason === "Technician go-back request" && !goBackIssue) { setError("Choose why the technician needs to go back."); setPending(false); return; }
    if (reason === "Technician missed appointment window" && !etaRaised) { setError("Confirm that the Tech ETA escalation was raised first."); setPending(false); return; }
    try {
      await draftQueue.current;
      const dueAt = wallTimeToUtc(String(form.get("dueAt")), zone);
      const appointmentStartUtc = techWindow ? wallTimeToUtc(dates.appointmentStart, zone) : null;
      const appointmentEndUtc = techWindow ? wallTimeToUtc(dates.appointmentEnd, zone) : null;
      if (techWindow && Date.parse(appointmentEndUtc!) <= Date.parse(appointmentStartUtc!)) throw new Error("Appointment end must follow its start");
      const input = { customerName: form.get("customerName"), accountNumber: form.get("accountNumber"), phoneNumber: form.get("phoneNumber"), caseNumber: form.get("caseNumber"), reason: form.get("reason"), priority: form.get("priority"), dueAt, sourceTimezone: zone, notes: form.get("notes"), promise: form.get("promise"), completionCondition: form.get("completionCondition"), appointmentStartUtc, appointmentEndUtc };
      const response = await fetch("/api/follow-ups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create follow-up");
      await saveDraft({ fields: {}, zone }).catch(() => toast.error("Follow-up saved, but the draft could not be cleared"));
      toast.success("Follow-up scheduled");
      router.replace("/follow-ups");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create follow-up");
    } finally { setPending(false); }
  }

  return <div className="mx-auto max-w-[800px]">
    <Link href="/follow-ups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Follow-ups</Link>
    <p className="mt-8 text-sm font-medium text-primary">NEW FOLLOW-UP</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Keep your promise.</h1>
    <p className="mt-3 text-muted-foreground">Capture what to call about and when. The queue will bring it back at the right time.</p>
    <form ref={formRef} onInput={() => scheduleDraft()} onSubmit={submit} className="mt-9 space-y-8">
      <section className="grid gap-5 border-t border-border pt-7 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="customerName">Customer name · optional</Label><Input id="customerName" name="customerName" defaultValue={initialDraft?.payload.fields.customerName ?? ""} /></div>
        <div className="space-y-2"><Label htmlFor="accountNumber">Account number</Label><Input id="accountNumber" name="accountNumber" inputMode="numeric" maxLength={15} placeholder="xxxxx-xxxxxx-xx" defaultValue={formatAccount(initialDraft?.payload.fields.accountNumber ?? "")} onInput={event=>{event.currentTarget.value=formatAccount(event.currentTarget.value);}} required /></div>
        <div className="space-y-2"><Label htmlFor="phoneNumber">Phone number</Label><Input id="phoneNumber" name="phoneNumber" type="tel" inputMode="numeric" maxLength={12} placeholder="xxx-xxx-xxxx" defaultValue={formatPhone(initialDraft?.payload.fields.phoneNumber ?? "")} onInput={event=>{event.currentTarget.value=formatPhone(event.currentTarget.value);}} required /></div>
        <div className="space-y-2"><Label htmlFor="caseNumber">Case number · optional</Label><Input id="caseNumber" name="caseNumber" defaultValue={initialDraft?.payload.fields.caseNumber ?? ""} /></div>
        <div className="space-y-2"><Label htmlFor="reason">Reason</Label><MendSelect id="reason" name="reason" required value={reason} onValueChange={chooseReason} options={FOLLOW_UP_REASONS.map(reason => ({ value: reason, label: reason }))} /></div>
        <div className="space-y-2"><Label htmlFor="callbackPreset">Call back in</Label><MendSelect id="callbackPreset" name="callbackPreset" value={callbackPreset} onValueChange={chooseCallbackPreset} options={callbackPresets} /></div>
        <div className="space-y-2"><Label htmlFor="dueAt">Call back at</Label><MendDatePicker id="dueAt" name="dueAt" mode="datetime" value={dates.dueAt} onValueChange={value => { setCallbackPreset("custom");setDates(previous => ({ ...previous, dueAt: value })); window.requestAnimationFrame(() => scheduleDraft()); }} required /></div>
        <div className="space-y-2"><Label htmlFor="zone">Time zone</Label><MendSelect id="zone" value={zone} onValueChange={value => { const next = value as Zone; setZone(next); if(callbackPreset!=="custom")setDates(current=>({...current,dueAt:callbackPresetWallTime(Number(callbackPreset),next)}));window.requestAnimationFrame(()=>scheduleDraft(next)); }} options={[{ value: "Africa/Cairo", label: "Cairo time" }, { value: "America/New_York", label: "New York time" }]} /></div>
        <div className="space-y-2"><Label htmlFor="priority">Priority</Label><MendSelect id="priority" name="priority" value={priority} onValueChange={value => { setPriority(value); window.requestAnimationFrame(() => scheduleDraft()); }} options={[{ value: "normal", label: "Normal" }, { value: "urgent", label: "Urgent" }]} /></div>
      </section>
      <div className="space-y-2 border-t border-border pt-7"><Label htmlFor="notes">Context and next step</Label><Textarea id="notes" name="notes" rows={5} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="What should you know when it is time to call?" /></div>
      <section className="grid gap-5 border-t border-border pt-7 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="promise">Promise to the customer · optional</Label><Textarea id="promise" name="promise" rows={3} value={promise} onChange={event=>setPromise(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="completionCondition">What completes this follow-up? · optional</Label><Textarea id="completionCondition" name="completionCondition" rows={3} value={completion} onChange={event=>setCompletion(event.target.value)} /></div>{needsTechnicianWindow(reason) && <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="windowPreset">Technician appointment window</Label><MendSelect id="windowPreset" name="windowPreset" value={windowPreset} onValueChange={chooseWindow} placeholder="Choose a window" options={[...FOLLOW_UP_WINDOWS.map(window=>({value:window.value,label:window.label})),{value:"custom",label:"Custom window"}]} /></div>
          <div className="space-y-2"><Label htmlFor="appointmentStart">Appointment starts</Label><MendDatePicker id="appointmentStart" name="appointmentStart" mode="datetime" value={dates.appointmentStart} onValueChange={value => { const preset=FOLLOW_UP_WINDOWS.find(window=>window.value===windowPreset); if (!preset || value.split("T")[1]!==preset.start) setWindowPreset("custom");setDates(previous => ({ ...previous, appointmentStart: value, appointmentEnd: preset && value.split("T")[1]===preset.start ? `${value.split("T")[0]}T${preset.end}` : previous.appointmentEnd })); window.requestAnimationFrame(() => scheduleDraft()); }} /></div>
          <div className="space-y-2"><Label htmlFor="appointmentEnd">Appointment ends</Label><MendDatePicker id="appointmentEnd" name="appointmentEnd" mode="datetime" value={dates.appointmentEnd} onValueChange={value => { setWindowPreset("custom");setDates(previous => ({ ...previous, appointmentEnd: value })); window.requestAnimationFrame(() => scheduleDraft()); }} /></div>
        </div>}
        {reason === "Technician go-back request" && <div className="space-y-2 sm:col-span-2"><Label htmlFor="goBackIssue">Why does the technician need to go back?</Label><MendSelect id="goBackIssue" name="goBackIssue" value={goBackIssue} onValueChange={value=>{setGoBackIssue(value);setNotes(followUpRecipe(reason,appointmentEndLabel(dates.appointmentEnd),value).context);window.requestAnimationFrame(()=>scheduleDraft());}} placeholder="Choose a reason" options={GO_BACK_ISSUES.map(value=>({value,label:value}))} /></div>}
        {reason === "Technician missed appointment window" && <label className="flex items-start gap-3 sm:col-span-2 text-sm"><input type="checkbox" name="etaRaised" value="true" checked={etaRaised} onChange={event=>{setEtaRaised(event.target.checked);window.requestAnimationFrame(()=>scheduleDraft());}} className="mt-1" /><span>Tech ETA escalation has been raised before this follow-up.</span></label>}</section>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-border pt-6"><Button variant="outline" type="button" asChild><Link href="/follow-ups">Cancel</Link></Button><Button type="submit" className="min-w-[160px]" disabled={pending}>{pending ? "Scheduling…" : "Schedule follow-up"}</Button></div>
    </form>
  </div>;
}
