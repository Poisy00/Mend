"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconSwap } from "@/components/ui/icon-swap";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    try { await navigator.clipboard.writeText(value); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  }
  return <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon-xs" className="relative size-7 before:absolute before:-inset-1.5" aria-label={copied ? `${label} copied` : `Copy ${label}`} onClick={() => void copy()}><IconSwap from={<Copy strokeWidth={1.75} className="size-3.5" />} to={<Check strokeWidth={2} className="size-3.5" />} swapped={copied} /></Button></TooltipTrigger><TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent></Tooltip>;
}
