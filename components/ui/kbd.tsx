"use client"

import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

const subscribe = () => () => {}
const isMacSnapshot = () => {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  return /mac|iphone|ipad/i.test(nav.userAgentData?.platform ?? navigator.platform)
}

/** `mod` resolves to ⌘ on Apple platforms and Ctrl elsewhere. Renders nothing until mounted. */
function Kbd({ keys, className }: { keys: string[]; className?: string }) {
  const mac = useSyncExternalStore<boolean | null>(subscribe, isMacSnapshot, () => null)
  if (mac === null) return null
  const labels = keys.map(key => (key === "mod" ? (mac ? "⌘" : "Ctrl") : key))
  return (
    <kbd
      aria-hidden="true"
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-muted px-1.5 font-mono text-[11px] font-medium text-text-secondary select-none",
        mac ? "gap-0" : "gap-0.5",
        className
      )}
    >
      {labels.map((label, index) => <span key={index}>{label}</span>)}
    </kbd>
  )
}

export { Kbd }
