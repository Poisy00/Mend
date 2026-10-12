import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const layer = "absolute inset-0 grid place-items-center transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(.2,0,0,1)] motion-reduce:transition-opacity";

/** Cross-fades between two icons (opacity, scale and a little blur) instead of hard-swapping them. */
export function IconSwap({ from, to, swapped }: { from: ReactNode; to: ReactNode; swapped: boolean }) {
  return <span className="relative inline-block size-4 shrink-0" aria-hidden="true">
    <span className={cn(layer, swapped && "scale-[.25] opacity-0 blur-[4px]")}>{from}</span>
    <span className={cn(layer, !swapped && "scale-[.25] opacity-0 blur-[4px]")}>{to}</span>
  </span>;
}
