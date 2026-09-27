"use client";

import { useState } from "react";
import { CalendarDays, Check, Clock3 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { MendSelect } from "@/components/ui/mend-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Mode = "date" | "datetime" | "time";
type Props = {
  mode?: Mode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  treatment?: "boxed" | "quiet";
  "aria-label"?: string;
};

const hours = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour).padStart(2, "0"), label: String(hour).padStart(2, "0") }));
const minutes = Array.from({ length: 60 }, (_, minute) => ({ value: String(minute).padStart(2, "0"), label: String(minute).padStart(2, "0") }));

function datePart(value: string) { return value.includes("T") ? value.split("T")[0] : value; }
function timePart(value: string) { return value.includes("T") ? value.split("T")[1]?.slice(0, 5) || "09:00" : /^\d{2}:\d{2}$/.test(value) ? value : "09:00"; }
function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function display(value: string, mode: Mode) {
  if (!value) return mode === "date" ? "Select date" : mode === "time" ? "Select time" : "Select date and time";
  if (mode === "time") return value;
  const [year, month, day] = datePart(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  const label = new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return mode === "datetime" ? `${label} · ${timePart(value)}` : label;
}

export function MendDatePicker({ mode = "date", value, defaultValue = "", onValueChange, name, id, required, disabled, className, treatment = "boxed", "aria-label": ariaLabel }: Props) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value === undefined ? internal : value;
  const date = datePart(current);
  const time = timePart(current);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : undefined;

  function commit(next: string) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function chooseDate(next: Date | undefined) {
    if (!next) return;
    const day = localDate(next);
    commit(mode === "datetime" ? `${day}T${time}` : day);
    if (mode === "date") setOpen(false);
  }

  function chooseTime(part: "hour" | "minute", next: string) {
    const [hour, minute] = time.split(":");
    const clock = part === "hour" ? `${next}:${minute}` : `${hour}:${next}`;
    commit(mode === "datetime" ? `${date || localDate(new Date())}T${clock}` : clock);
  }

  return <Popover open={open} onOpenChange={setOpen}>
    <input key={current} type="hidden" name={name} defaultValue={current} required={required} />
    <PopoverTrigger asChild><button id={id} type="button" disabled={disabled} aria-label={ariaLabel} aria-expanded={open} data-treatment={treatment} className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 text-left text-[13px] shadow-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/35 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50", treatment === "quiet" && "rounded-none border-0 border-b border-[var(--border-subtle)] bg-transparent px-0 text-[15px] font-medium text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:bg-transparent focus-visible:border-[var(--focus-ring)] focus-visible:ring-0 dark:bg-transparent", !current && "text-muted-foreground", className)}>
      <span className="truncate">{display(current, mode)}</span>{mode === "time" ? <Clock3 className="size-4 shrink-0 text-muted-foreground" /> : <CalendarDays className="size-4 shrink-0 text-muted-foreground" />}
    </button></PopoverTrigger>
    <PopoverContent align="start" sideOffset={6} onInteractOutside={event => { if ((event.target as Element).closest("[data-slot=select-content]")) event.preventDefault(); }} className="w-auto max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-popover p-2 shadow-[0_16px_42px_-14px_rgba(20,18,30,.3)] [animation-duration:170ms]">
      {mode !== "time" && <Calendar mode="single" selected={selected} onSelect={chooseDate} defaultMonth={selected || new Date()} captionLayout="label" className="rounded-xl" />}
      {mode !== "date" && <div className={cn("flex items-center gap-2 px-2 pb-2", mode === "datetime" && "border-t border-border pt-3")}>
        <Clock3 className="size-4 text-muted-foreground" />
        <MendSelect value={time.split(":")[0]} onValueChange={next => chooseTime("hour", next)} options={hours} aria-label="Hour" className="w-[82px]" />
        <span className="text-muted-foreground">:</span>
        <MendSelect value={time.split(":")[1]} onValueChange={next => chooseTime("minute", next)} options={minutes} aria-label="Minute" className="w-[82px]" />
        <button type="button" onClick={() => setOpen(false)} className="ml-auto grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground transition-transform duration-100 active:scale-[.97]" aria-label="Done"><Check className="size-4" /></button>
      </div>}
    </PopoverContent>
  </Popover>;
}
