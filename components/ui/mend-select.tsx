"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type MendSelectOption = { value: string; label: string; disabled?: boolean };

type MendSelectProps = {
  options: MendSelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  treatment?: "boxed" | "quiet";
  "aria-label"?: string;
};

/** One accessible, form-compatible select treatment for Mend's workspace. */
export function MendSelect({ options, value, defaultValue, onValueChange, placeholder = "Select an option", name, id, required, disabled, className, treatment = "boxed", "aria-label": ariaLabel }: MendSelectProps) {
  return <Select name={name} value={value} defaultValue={defaultValue} onValueChange={onValueChange} required={required} disabled={disabled}>
    <SelectTrigger id={id} aria-label={ariaLabel} data-treatment={treatment} className={cn("w-full min-w-0 rounded-xl border-border bg-card px-3.5 shadow-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/35 hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-primary/15 data-[size=default]:h-10", treatment === "quiet" && "rounded-none border-0 border-b border-[var(--border-subtle)] bg-transparent px-0 text-[15px] font-medium text-[var(--text-primary)] shadow-none hover:border-[var(--text-secondary)] hover:bg-transparent focus-visible:border-[var(--focus-ring)] focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent", className)}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent position="popper" align="start" sideOffset={5} className="min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) rounded-xl border-border bg-popover p-1 shadow-[0_12px_32px_-12px_rgba(20,18,30,.24)] data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0 [animation-duration:170ms]">
      {options.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled} className="min-h-9 rounded-lg px-3 py-2 text-[13px] focus:bg-accent data-[state=checked]:font-medium">{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}
