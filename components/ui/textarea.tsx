import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, treatment = "boxed", ...props }: React.ComponentProps<"textarea"> & { treatment?: "boxed" | "quiet" | "document" }) {
  return (
    <textarea
      data-slot="textarea"
      data-treatment={treatment}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        treatment === "quiet" && "min-h-24 resize-y rounded-none border-0 shadow-[inset_0_-1px_0_var(--control-edge)] bg-transparent px-0 py-2 text-[15px] leading-6 text-text-primary placeholder:text-text-muted focus-visible:shadow-[inset_0_-2px_0_var(--primary)] focus-visible:ring-0 focus-visible:outline-none aria-invalid:shadow-[inset_0_-2px_0_var(--destructive)] dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
