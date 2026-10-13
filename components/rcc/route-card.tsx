"use client";

import { useSyncExternalStore } from "react";
import { newYorkClock } from "@/lib/rcc/expedite-routing";
import type { ExpediteInput, RouteDecision } from "@/lib/rcc/types";

const REFRESH_MS = 30_000;
const CUTOFF_MINUTES = 15 * 60;

const subscribe = (onChange: () => void) => {
  const timer = window.setInterval(onChange, REFRESH_MS);
  return () => window.clearInterval(timer);
};
// Bucketed so the snapshot is stable between refreshes; null on the server keeps hydration clean.
const bucket = () => Math.floor(Date.now() / REFRESH_MS) * REFRESH_MS;

function formatClock(minutes: number) {
  const hour = Math.floor(minutes / 60), minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function formatCountdown(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours ? (rest ? `${hours} h ${rest} min` : `${hours} h`) : `${rest} min`;
}

export function RouteCard({ route, teamMode, recipient }: { route: RouteDecision; teamMode: ExpediteInput["teamMode"]; recipient: string }) {
  const now = useSyncExternalStore<number | null>(subscribe, bucket, () => null);
  const minutes = now === null ? null : newYorkClock(new Date(now)).minutes;
  const remaining = minutes === null ? null : CUTOFF_MINUTES - minutes;
  return <div aria-live="polite" className="shrink-0 rounded-xl bg-secondary px-[18px] py-3">
    <div className="flex flex-wrap items-center gap-2.5">
      <h3 className="t-heading">{route.name}</h3>
      <span className="t-caption rounded-full bg-accent px-2 py-0.5 !font-semibold text-primary">{teamMode === "auto" ? "Automatic" : "Override"}</span>
    </div>
    <p className="t-body mt-0.5 flex flex-wrap gap-x-3 text-text-secondary">
      {minutes !== null && remaining !== null && <span>{formatClock(minutes)} ET, {remaining > 0 ? `${formatCountdown(remaining)} to Long Island cutoff` : "after cutoff"}</span>}
      <span className="min-w-0 break-all">{recipient.trim() || "No recipient set"}</span>
    </p>
    {route.warning && <p className="t-body mt-2 rounded-lg bg-status-due-tint px-3 py-2 font-medium text-status-due">{route.warning}</p>}
  </div>;
}
