"use client";

import { useEffect, useSyncExternalStore } from "react";
import { classifyFollowUp } from "@/lib/follow-ups/rules";
import type { FollowUp } from "@/lib/follow-ups/types";

export type QueueCounts = { overdue: number; now: number };
const empty: QueueCounts = { overdue: 0, now: 0 };
let counts = empty;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export async function refreshQueueCounts() {
  try {
    const response = await fetch("/api/follow-ups?limit=100", { cache: "no-store" });
    if (!response.ok) return;
    const { items } = await response.json() as { items: FollowUp[] };
    const nowMs = Date.now();
    const buckets = items.map(item => classifyFollowUp(item, nowMs));
    const next = { overdue: buckets.filter(bucket => bucket === "overdue").length, now: buckets.filter(bucket => bucket === "now").length };
    if (next.overdue === counts.overdue && next.now === counts.now) return;
    counts = next;
    listeners.forEach(listener => listener());
  } catch {
    // The count is a convenience; the queue itself stays authoritative.
  }
}

export function useQueueCounts(): QueueCounts {
  useEffect(() => {
    void refreshQueueCounts();
    const timer = window.setInterval(() => void refreshQueueCounts(), 60_000);
    const visible = () => { if (document.visibilityState === "visible") void refreshQueueCounts(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return useSyncExternalStore(subscribe, () => counts, () => empty);
}
