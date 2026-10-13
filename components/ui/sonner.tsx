"use client"

import {
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** The shared iris check, the same mark as a met readiness item. */
const IrisCheck = () => (
  <span aria-hidden="true" className="mend-check" data-state="met">
    <svg viewBox="0 0 16 16"><path d="M4.6 8.4 7 10.8l4.4-5" pathLength={1} /></svg>
  </span>
)

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={12}
      icons={{
        success: <IrisCheck />,
        info: <InfoIcon className="size-4 text-text-secondary" />,
        warning: <TriangleAlertIcon className="size-4 text-text-secondary" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!items-start !gap-2.5 !rounded-[12px] !border !border-border !bg-popover !px-4 !py-3.5 !text-text-primary !shadow-[var(--shadow-overlay)]",
          icon: "!m-0 !mt-0.5 !size-4 !shrink-0",
          content: "!gap-0.5",
          title: "!text-sm !leading-5 !font-medium !text-text-primary",
          description: "!text-[13px] !leading-[18px] !font-normal !text-text-secondary",
          actionButton: "!ml-auto !h-7 !shrink-0 !self-center !rounded-md !bg-transparent !px-2 !text-[13px] !font-semibold !text-primary hover-fine:!bg-accent focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-ring",
          cancelButton: "!h-7 !shrink-0 !self-center !rounded-md !bg-transparent !px-2 !text-[13px] !font-semibold !text-text-secondary hover-fine:!bg-secondary focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-ring",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
          "--width": "360px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
