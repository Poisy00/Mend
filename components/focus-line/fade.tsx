"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades its content in when `swapKey` changes, so a filter or selection change never hard-swaps.
 * Nothing animates on first mount. `panel` is the quicker fade used inside detail panels.
 */
export function FadeSwap({ swapKey, children, className, speed = "list" }: { swapKey: string | number; children: ReactNode; className?: string; speed?: "list" | "panel" | "page" }) {
  const [seen, setSeen] = useState(swapKey);
  const [changed, setChanged] = useState(false);
  if (seen !== swapKey) { setSeen(swapKey); setChanged(true); }
  return <div key={swapKey} className={cn(changed && (speed === "panel" ? "mend-fade-panel" : speed === "page" ? "mend-page-enter" : "mend-fade-list"), className)}>{children}</div>;
}
