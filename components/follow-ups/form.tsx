"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { wallTimeToUtc } from "@/lib/follow-ups/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MendSelect } from "@/components/ui/mend-select";
import { MendDatePicker } from "@/components/ui/mend-date-picker";

const reasons = ["Customer requested callback", "Call disconnected", "Waiting for reboot/reset", "Make sure technician arrived", "Technician missed appointment window", "Technician go-back request", "Make sure service is stable", "Check appointment status", "Check escalation/update", "Verify issue resolution", "Continue troubleshooting", "Waiting for information", "Other"];
type Zone = "Africa/Cairo" | "America/New_York";
type Draft = { fields: Record<string, string>; zone: Zone };

export function FollowUpForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const draftRevision = useRef(0);
  const draftQueue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<number | undefined>(undefined);
  const [zone, setZone] = useState<Zone>("Africa/Cairo");
  const [reason, setReason] = useState(reasons[0]);
  const [priority, setPriority] = useState("normal");
  const [dates, setDates] = useState({ dueAt: "", appointmentStart: "", appointmentEnd: "" });
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/follow-ups/draft").then(response => response.json() as Promise<{ draft?: { payload: Draft; revision: number } }>).then(data => {
      if (data.draft && formRef.current) {
        draftRevision.current = data.draft.revision;
        for (const [name, value] of Object.entries(data.draft.payload?.fields ?? {})) {
          if (name === "reason") { setReason(value); continue; }
          if (name === "priority") { setPriority(value); continue; }
          if (name === "dueAt" || name === "appointmentStart" || name === "appointmentEnd") { setDates(previous => ({ ...previous, [name]: value })); continue; }
          const field = formRef.current.elements.namedItem(name);
          if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) field.value = value;
        }
        if (data.draft.payload?.zone) setZone(data.draft.payload.zone);
      }
      setReady(true);
    }).catch(() => { setReady(true); toast.error("Could not restore your saved follow-up"); });
    return () => window.clearTimeout(timer.current);
  }, []);

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
    if (!ready || pending) return;
    window.clearTimeout(timer.current);
    const snapshot = currentDraft(nextZone);
    timer.current = window.setTimeout(() => { void saveDraft(snapshot).catch(() => toast.error("Follow-up draft could not be saved")); }, 700);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    window.clearTimeout(timer.current);
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await draftQueue.current;
      const dueAt = wallTimeToUtc(String(form.get("dueAt")), zone);
      const appointmentStartUtc = form.get("appointmentStart") ? wallTimeToUtc(String(form.get("appointmentStart")), zone) : null;
      const appointmentEndUtc = form.get("appointmentEnd") ? wallTimeToUtc(String(form.get("appointmentEnd")), zone) : null;
      const input = { customerName: form.get("customerName"), accountNumber: form.get("accountNumber"), phoneNumber: form.get("phoneNumber"), caseNumber: form.get("caseNumber"), reason: form.get("reason"), priority: form.get("priority"), dueAt, sourceTimezone: zone, notes: form.get("notes"), promise: form.get("promise"), completionCondition: form.get("completionCondition"), appointmentStartUtc, appointmentEndUtc };
      const response = await fetch("/api/follow-ups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create follow-up");
      await saveDraft({ fields: {}, zone }).catch(() => toast.error("Follow-up saved, but the draft could not be cleared"));
      toast.success("Follow-up scheduled");
      window.location.replace("/follow-ups");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create follow-up");
    } finally { setPending(false); }
  }

  return <div className="mx-auto max-w-[800px]">
    <a href="/follow-ups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Follow-ups</a>
    <p className="mt-8 text-sm font-medium text-primary">NEW FOLLOW-UP</p>
    <h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Keep your promise.</h1>
    <p className="mt-3 text-muted-foreground">Capture what to call about and when. The queue will bring it back at the right time.</p>
    <form ref={formRef} onInput={() => scheduleDraft()} onSubmit={submit} className="mt-9 space-y-8">
      <section className="grid gap-5 border-t border-border pt-7 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="customerName">Customer name · optional</Label><Input id="customerName" name="customerName" /></div>
        <div className="space-y-2"><Label htmlFor="accountNumber">Account number</Label><Input id="accountNumber" name="accountNumber" required /></div>
        <div className="space-y-2"><Label htmlFor="phoneNumber">Phone number</Label><Input id="phoneNumber" name="phoneNumber" type="tel" required /></div>
        <div className="space-y-2"><Label htmlFor="caseNumber">Case number · optional</Label><Input id="caseNumber" name="caseNumber" /></div>
        <div className="space-y-2"><Label htmlFor="reason">Reason</Label><MendSelect id="reason" name="reason" required value={reason} onValueChange={value => { setReason(value); window.requestAnimationFrame(() => scheduleDraft()); }} options={reasons.map(reason => ({ value: reason, label: reason }))} /></div>
        <div className="space-y-2"><Label htmlFor="dueAt">Call back at</Label><MendDatePicker id="dueAt" name="dueAt" mode="datetime" value={dates.dueAt} onValueChange={value => { setDates(previous => ({ ...previous, dueAt: value })); window.requestAnimationFrame(() => scheduleDraft()); }} required /></div>
        <div className="space-y-2"><Label htmlFor="zone">Time zone</Label><MendSelect id="zone" value={zone} onValueChange={value => { const next = value as Zone; setZone(next); scheduleDraft(next); }} options={[{ value: "Africa/Cairo", label: "Cairo time" }, { value: "America/New_York", label: "New York time" }]} /></div>
        <div className="space-y-2"><Label htmlFor="priority">Priority</Label><MendSelect id="priority" name="priority" value={priority} onValueChange={value => { setPriority(value); window.requestAnimationFrame(() => scheduleDraft()); }} options={[{ value: "normal", label: "Normal" }, { value: "urgent", label: "Urgent" }]} /></div>
      </section>
      <div className="space-y-2 border-t border-border pt-7"><Label htmlFor="notes">Context and next step</Label><Textarea id="notes" name="notes" rows={5} placeholder="What should you know when it is time to call?" /></div>
      <section className="grid gap-5 border-t border-border pt-7 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="promise">Promise to the customer · optional</Label><Textarea id="promise" name="promise" rows={3} /></div><div className="space-y-2"><Label htmlFor="completionCondition">What completes this follow-up? · optional</Label><Textarea id="completionCondition" name="completionCondition" rows={3} /></div><div className="space-y-2"><Label htmlFor="appointmentStart">Appointment starts · optional</Label><MendDatePicker id="appointmentStart" name="appointmentStart" mode="datetime" value={dates.appointmentStart} onValueChange={value => { setDates(previous => ({ ...previous, appointmentStart: value })); window.requestAnimationFrame(() => scheduleDraft()); }} /></div><div className="space-y-2"><Label htmlFor="appointmentEnd">Appointment ends · optional</Label><MendDatePicker id="appointmentEnd" name="appointmentEnd" mode="datetime" value={dates.appointmentEnd} onValueChange={value => { setDates(previous => ({ ...previous, appointmentEnd: value })); window.requestAnimationFrame(() => scheduleDraft()); }} /></div></section>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-border pt-6"><Button variant="outline" type="button" asChild><a href="/follow-ups">Cancel</a></Button><Button type="submit" className="min-w-[160px]" disabled={pending || !ready}>{pending ? "Scheduling…" : "Schedule follow-up"}</Button></div>
    </form>
  </div>;
}
