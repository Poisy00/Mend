import { cn } from "@/lib/utils";

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-[10px] bg-muted p-[3px]">
    {options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={cn("h-7 rounded-md px-3 text-[13px] font-medium text-text-secondary transition-[background-color,color,transform] duration-150 active:scale-[.97]", value === option.value ? "bg-surface text-text-primary shadow-[0_1px_2px_rgba(27,27,24,.08),0_0_0_1px_var(--border)]" : "hover:text-text-primary")}>{option.label}</button>)}
  </div>;
}
