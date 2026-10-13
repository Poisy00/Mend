import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium [&_svg]:[stroke-width:1.75] whitespace-nowrap transition-[transform,background-color,color,box-shadow] duration-[var(--dur-quick)] ease-[var(--ease-out)] active:scale-[0.96] motion-move outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-press hover-fine:bg-primary-hover",
        destructive: "text-destructive hover-fine:bg-status-overdue-tint",
        "destructive-solid": "bg-destructive text-primary-foreground hover-fine:bg-destructive/90",
        outline:
          "bg-sheet text-text-primary shadow-[inset_0_0_0_1px_var(--border),0_1px_1px_rgba(27,27,24,.04)] hover-fine:shadow-[inset_0_0_0_1px_var(--control-edge),0_1px_1px_rgba(27,27,24,.04)]",
        secondary:
          "bg-sheet text-text-primary shadow-[inset_0_0_0_1px_var(--border),0_1px_1px_rgba(27,27,24,.04)] hover-fine:shadow-[inset_0_0_0_1px_var(--control-edge),0_1px_1px_rgba(27,27,24,.04)]",
        ghost:
          "text-text-primary hover-fine:bg-surface-hover",
        link: "text-primary underline-offset-4 hover-fine:underline",
      },
      size: {
        default: "h-9 px-3.5 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  static: isStatic = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    static?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }), isStatic && "active:scale-100")}
      {...props}
    />
  )
}

export { Button, buttonVariants }
