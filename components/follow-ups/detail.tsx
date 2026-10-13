"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";
import { wallTimeToUtc } from "@/lib/follow-ups/time";
import { historyLabel } from "@/components/focus-line/actions";
import { Button } from "@/components/ui/button";
import { SaveCaseDialog } from "@/components/cases/save-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MendSelect } from "@/components/ui/mend-select";
import { MendDatePicker } from "@/components/ui/mend-date-picker";
import { Kbd } from "@/components/ui/kbd";
import { formatAccount, formatPhone, formatAccountIfComplete, displayName } from "@/lib/display/format";
import { relativeTime } from "@/lib/display/relative";
import { followUpDisplay } from "@/lib/follow-ups/display";
import { StatusPill } from "@/components/ui/status";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

type HistoryEvent = { id: string; type: string; createdAt: string };

/** The six call outcomes. Keys 1 to 6 run them; "reschedule" opens the time picker instead of sending. */
export const outcomeOptions: { key: string; label: string; effect: string; command: FollowUpCommand }[] = [
  { key: "1", label: "Busy", effect: "Back in 10 min", command: { type: "busy" } },
  { key: "2", label: "No answer", effect: "Asks about voicemail next", command: { type: "no_answer" } },
  { key: "3", label: "Follow up", effect: "+30 min", command: { type: "follow_up" } },
  { key: "4", label: "Escalation", effect: "+30 min", command: { type: "escalation_required" } },
  { key: "5", label: "Wrong number", effect: "Closes it", command: { type: "wrong_number" } },
  { key: "6", label: "Pick a time…", effect: "Choose a date and time", command: { type: "reschedule" } },
];

const zoneName = (zone: FollowUp["sourceTimezone"]) => zone === "Africa/Cairo" ? "Cairo" : "New York";
const dateTime = (instant: string, zone: FollowUp["sourceTimezone"]) => new Date(instant).toLocaleString("en-US", { timeZone: zone, dateStyle: "medium", timeStyle: "short" });
const heading = "t-meta mb-2.5 !font-semibold text-text-secondary";
const fieldLabel = "t-meta grid gap-1.5 font-medium text-text-secondary";

function localInput(instant:string|null,zone:FollowUp["sourceTimezone"]){if(!instant)return "";const parts=new Intl.DateTimeFormat("en-US",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(instant));const get=(part:string)=>parts.find(item=>item.type===part)?.value??"";return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;}

export function FollowUpDetail({ item, now, mended, pickOpen, onPickOpenChange, onAction, onSaveProfile, onClose, embedded }: {
  item: FollowUp; now: number; mended: boolean; pickOpen: boolean; onPickOpenChange: (open: boolean) => void;
  onAction: (item: FollowUp, command: FollowUpCommand) => Promise<void>; onSaveProfile: (item: FollowUp, profile: Record<string, unknown>) => Promise<boolean>;
  onClose?: () => void; embedded?: boolean;
}) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const closed = ["completed", "abandoned", "cancelled"].includes(item.status);
  const display = followUpDisplay(item, now);
  const phone = item.phoneNumber.replace(/\D/g, "").length === 10 ? formatPhone(item.phoneNumber) : item.phoneNumber;
  const account = formatAccountIfComplete(item.accountNumber);
  const zone = zoneName(item.sourceTimezone);

  useEffect(() => {
    let active = true;
    fetch(`/api/follow-ups/${item.id}`).then(response => response.json() as Promise<{ history?: HistoryEvent[] }>).then(data => {
      if (active && Array.isArray(data.history)) setHistory(data.history);
    }).catch(() => {});
    return () => { active = false; };
  }, [item.id, item.revision]);
  useEffect(() => { if (editing) form.current?.querySelector("input")?.focus(); }, [editing]);

  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);try{const data=new FormData(event.currentTarget);const start=String(data.get("appointmentStart")??"");const end=String(data.get("appointmentEnd")??"");const profile={customerName:String(data.get("customerName")??""),accountNumber:String(data.get("accountNumber")??""),phoneNumber:String(data.get("phoneNumber")??""),caseNumber:String(data.get("caseNumber")??""),reason:String(data.get("reason")??""),priority:String(data.get("priority")??"normal"),dueAt:item.dueAt,sourceTimezone:item.sourceTimezone,notes:String(data.get("notes")??""),promise:String(data.get("promise")??""),completionCondition:String(data.get("completionCondition")??""),appointmentStartUtc:start?wallTimeToUtc(start,item.sourceTimezone):null,appointmentEndUtc:end?wallTimeToUtc(end,item.sourceTimezone):null};if(await onSaveProfile(item,profile))setEditing(false);}catch(error){toast.error(error instanceof Error?error.message:"Could not save profile");}finally{setSaving(false);}}

  const copyRow = (value: string, label: string) => <span className="flex items-center gap-1"><span className="num">{value}</span><CopyButton value={value} label={label} /></span>;

  return <aside aria-label="Selected follow-up" className={cn("relative", !embedded && "mend-pane max-h-[calc(100dvh-3rem)] overflow-auto overscroll-contain rounded-[14px] bg-sheet p-6 shadow-[0_0_0_1px_var(--border),0_12px_32px_-20px_rgb(0_0_0/.18)]")}>
    {onClose && !embedded && <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details" className="absolute top-3 right-3"><X /></Button>}
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill tone={display.tone}>{display.label}</StatusPill>
      {item.priority === "urgent" && !closed && <span className="t-caption rounded-full bg-status-overdue-tint px-2 py-0.5 !font-semibold text-status-overdue">Urgent</span>}
    </div>
    <h2 className={cn("mt-3 text-[24px] leading-[1.2] font-semibold tracking-[-0.02em]", mended && "mend-stitch")}>{displayName(item.customerName)}</h2>
    <p className="t-body-lg mt-1.5 text-text-secondary">{item.reason}</p>
    <div className="mt-5 flex items-center justify-between rounded-[12px] bg-desk px-4 py-3.5">
      <div><p className="t-caption text-text-secondary">Callback number</p><p className="num text-[24px] leading-8 font-semibold">{phone}</p></div>
      <CopyButton value={phone} label="phone number" />
    </div>

    {closed
      ? <div className="mt-6"><h3 className={heading}>This follow-up is closed</h3><Button variant="outline" className="h-12 w-full text-[15px]" onClick={() => void onAction(item, { type: "restore" })}>Restore follow-up</Button></div>
      : item.status === "voicemail_required"
        ? <div className="mt-6"><h3 className={heading}>Did you leave a voicemail?</h3><div className="grid grid-cols-2 gap-2">
          <Button className="h-12 text-[15px]" onClick={() => void onAction(item, { type: "confirm_voicemail", voicemailLeft: true })}>Yes, left one</Button>
          <Button variant="outline" className="h-12 text-[15px]" onClick={() => void onAction(item, { type: "confirm_voicemail", voicemailLeft: false })}>No voicemail</Button>
        </div></div>
        : <div className="mt-6">
          <h3 className={heading}>How did the call go?</h3>
          <Button className="h-12 w-full text-[15px]" onClick={() => void onAction(item, { type: "resolved" })}><Check />Resolved<Kbd keys={["E"]} className="[@media(hover:none)]:hidden" /></Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {outcomeOptions.map(option => {
              const pick = option.command.type === "reschedule";
              return <button key={option.key} type="button" aria-expanded={pick ? pickOpen : undefined} onClick={() => pick ? onPickOpenChange(!pickOpen) : void onAction(item, option.command)}
                className={cn("flex min-h-[60px] w-full flex-col items-start gap-0.5 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors duration-[var(--dur-quick)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", pick && pickOpen ? "bg-accent shadow-[inset_0_0_0_1px_var(--primary)]" : "bg-sheet shadow-[inset_0_0_0_1px_var(--border)] hover-fine:bg-surface-hover")}>
                <span className="t-label flex w-full items-center justify-between gap-2 !font-semibold">{option.label}<Kbd keys={[option.key]} className="[@media(hover:none)]:hidden" /></span>
                <span className="t-caption text-text-secondary">{option.effect}</span>
              </button>;
            })}
          </div>
          {pickOpen && <div className="mt-2 grid gap-2.5 rounded-[10px] bg-secondary p-3">
            <label className="t-meta min-w-[190px] space-y-1.5 font-medium text-text-secondary"><span>New time, {zone}</span><MendDatePicker mode="datetime" value={rescheduleAt} onValueChange={setRescheduleAt} /></label>
            <Button onClick={() => { try { if (!rescheduleAt) throw new Error("Choose a new time"); void onAction(item, { type: "reschedule", dueAt: wallTimeToUtc(rescheduleAt, item.sourceTimezone) }); } catch (error) { toast.error(error instanceof Error ? error.message : "Choose a valid time"); } }}>Reschedule</Button>
          </div>}
        </div>}

    {editing
      ? <form ref={form} key={`${item.id}-${item.revision}`} onSubmit={save} className="mt-6 grid gap-3.5">
        <label className={fieldLabel}>Customer name<Input name="customerName" defaultValue={item.customerName}/></label>
        <label className={fieldLabel}>Account number<Input name="accountNumber" inputMode="numeric" maxLength={15} placeholder="xxxxx-xxxxxx-xx" required defaultValue={formatAccount(item.accountNumber)} onInput={event=>{event.currentTarget.value=formatAccount(event.currentTarget.value);}}/></label>
        <label className={fieldLabel}>Phone number<Input name="phoneNumber" type="tel" inputMode="numeric" maxLength={12} placeholder="xxx-xxx-xxxx" required defaultValue={formatPhone(item.phoneNumber)} onInput={event=>{event.currentTarget.value=formatPhone(event.currentTarget.value);}}/></label>
        <label className={fieldLabel}>Case number<Input name="caseNumber" defaultValue={item.caseNumber}/></label>
        <label className={fieldLabel}>Reason<Input name="reason" required defaultValue={item.reason}/></label>
        <label className={fieldLabel}>Priority<MendSelect name="priority" defaultValue={item.priority} options={[{value:"normal",label:"Normal"},{value:"urgent",label:"Urgent"}]} /></label>
        <label className={fieldLabel}>Context<Textarea name="notes" defaultValue={item.notes}/></label>
        <label className={fieldLabel}>Promise<Textarea name="promise" defaultValue={item.promise}/></label>
        <label className={fieldLabel}>Complete when<Textarea name="completionCondition" defaultValue={item.completionCondition}/></label>
        <label className={fieldLabel}>Appointment starts, {zone}<MendDatePicker mode="datetime" name="appointmentStart" defaultValue={localInput(item.appointmentStartUtc,item.sourceTimezone)}/></label>
        <label className={fieldLabel}>Appointment ends<MendDatePicker mode="datetime" name="appointmentEnd" defaultValue={localInput(item.appointmentEndUtc,item.sourceTimezone)}/></label>
        <div className="flex gap-2"><Button disabled={saving} type="submit">{saving?"Saving…":"Save profile"}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
      </form>
      : <>
        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3.5">
          <div><dt className="t-caption text-text-secondary">Account</dt><dd className="t-label">{copyRow(account, "account number")}</dd></div>
          <div><dt className="t-caption text-text-secondary">Case</dt><dd className="t-label">{item.caseNumber ? copyRow(item.caseNumber, "case number") : "Not saved"}</dd></div>
          <div className="col-span-2"><dt className="t-caption text-text-secondary">Due</dt><dd className="t-label">{dateTime(item.dueAt, item.sourceTimezone)}, {zone}</dd></div>
          {item.appointmentStartUtc && <div className="col-span-2"><dt className="t-caption text-text-secondary">Appointment</dt><dd className="t-label">{dateTime(item.appointmentStartUtc, item.sourceTimezone)}{item.appointmentEndUtc ? ` to ${new Date(item.appointmentEndUtc).toLocaleTimeString("en-US", { timeZone: item.sourceTimezone, timeStyle: "short" })}` : ""}</dd></div>}
          {item.promise && <div className="col-span-2"><dt className="t-caption text-text-secondary">Promise</dt><dd className="t-meta">{item.promise}</dd></div>}
          {item.completionCondition && <div className="col-span-2"><dt className="t-caption text-text-secondary">Complete when</dt><dd className="t-meta">{item.completionCondition}</dd></div>}
        </dl>
        {item.notes && <section className="mt-6" aria-label="Context"><h3 className={heading}>Context</h3><p className="t-body whitespace-pre-wrap text-text-secondary">{item.notes}</p></section>}
      </>}

    <section className="mt-6" aria-label="Follow-up history">
      <h3 className={heading}>History</h3>
      {history.length
        ? <ul>{history.map(event => <li key={event.id} className="t-meta grid grid-cols-[80px_1fr] gap-3 py-1.5"><span className="whitespace-nowrap text-text-muted">{relativeTime(event.createdAt, now)}</span><span>{historyLabel(event.type)}</span></li>)}</ul>
        : <p className="t-meta text-text-secondary">No history yet.</p>}
    </section>

    <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-border pt-5">
      {confirmCancel
        ? <div role="alert" className="flex w-full flex-wrap items-center gap-2 rounded-[10px] bg-status-overdue-tint px-3 py-2.5 text-status-overdue">
          <span className="t-label mr-auto !font-semibold">Cancel this follow-up?</span>
          <Button variant="outline" size="sm" className="text-status-overdue" onClick={() => { setConfirmCancel(false); void onAction(item, { type: "cancel" }); }}>Yes, cancel it</Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>Keep it</Button>
        </div>
        : <>
          <Button variant="outline" onClick={() => setEditing(value => !value)}>{editing ? "Close profile" : "Edit profile"}</Button>
          <SaveCaseDialog source={{ type: "follow-up", id: item.id, status: item.status }} initialCustomer={item.customerName} initialAccount={item.accountNumber} initialSummary={item.reason} />
          {!closed && <Button variant="destructive" className="ml-auto" onClick={() => setConfirmCancel(true)}>Cancel follow-up</Button>}
        </>}
    </div>
  </aside>;
}
