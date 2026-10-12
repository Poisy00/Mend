import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, treatment = "boxed", ...props }: React.ComponentProps<"input"> & { treatment?: "boxed" | "quiet" }) {
  return (
    <input
      type={type}
      data-slot="input"
      data-treatment={treatment}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        treatment === "quiet" && "h-10 rounded-none border-0 shadow-[inset_0_-1px_0_var(--control-edge)] bg-transparent px-0 py-2 text-[15px] font-medium text-text-primary placeholder:font-normal placeholder:text-text-muted focus-visible:shadow-[inset_0_-2px_0_var(--primary)] focus-visible:ring-0 focus-visible:outline-none aria-invalid:shadow-[inset_0_-2px_0_var(--destructive)] dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Input }
