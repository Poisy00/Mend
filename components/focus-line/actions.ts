"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { refreshQueueCounts } from "@/components/use-queue-counts";
import type { FollowUp, FollowUpCommand } from "@/lib/follow-ups/types";

export const snoozeOptions = [{ label: "30 minutes", minutes: 30 }, { label: "1 hour", minutes: 60 }, { label: "2 hours", minutes: 120 }];
export const clockTime = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const historyLabel = (type: string) => `${type.charAt(0).toUpperCase()}${type.replaceAll("_", " ").slice(1)}`;

/**
 * Send, undo, resolve and snooze for the Focus line, with the toasts and Undo actions.
 * Resolve plays the stitch first (`mendedId`), then collapses the row (`leavingId`) before `onResolved` runs.
 */
export function useFollowUpActions({ onResolved, onSnoozed, onRestored, onFailed }: {
  onResolved?: (item: FollowUp) => void; onSnoozed?: (item: FollowUp) => void; onRestored?: (item: FollowUp) => void; onFailed?: () => void;
} = {}) {
  const router = useRouter();
  const [mendedId, setMendedId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const finishing = useRef(new Set<string>());
  const resolved = useRef(new Map<string, FollowUp>());

  async function send(item: FollowUp, command: FollowUpCommand): Promise<FollowUp | null> {
    try {
      const response = await fetch(`/api/follow-ups/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision: item.revision, command }) });
      const data = await response.json() as { item?: FollowUp };
      if (response.ok && data.item) return data.item;
      toast.error(response.status === 409 ? "Unable to update this follow-up. It changed elsewhere — refreshed." : "Unable to update this follow-up.");
    } catch {
      toast.error("Unable to update this follow-up.");
    }
    if (onFailed) onFailed(); else router.refresh();
    return null;
  }

  async function undo(item: FollowUp, command: FollowUpCommand, message: string) {
    const restored = await send(item, command);
    if (!restored) return;
    onRestored?.(restored);
    toast.success(message);
    void refreshQueueCounts();
    router.refresh();
  }

  async function resolve(item: FollowUp) {
    const updated = await send(item, { type: "resolved" });
    if (!updated) return;
    resolved.current.set(item.id, updated);
    setMendedId(item.id);
    window.setTimeout(() => finish(item.id), 1500);
    void refreshQueueCounts();
    toast.success("Marked resolved.", { duration: 5000, action: { label: "Undo", onClick: () => void undo(updated, { type: "restore" }, "Follow-up restored.") } });
  }

  // The stitch plays first, then the row collapses and the list re-groups.
  function finish(id: string) {
    if (!resolved.current.has(id) || finishing.current.has(id)) return;
    finishing.current.add(id);
    setLeavingId(id);
    window.setTimeout(() => {
      const updated = resolved.current.get(id);
      resolved.current.delete(id);
      finishing.current.delete(id);
      if (updated) onResolved?.(updated);
      setMendedId(null);
      setLeavingId(null);
      router.refresh();
    }, 220);
  }

  async function snooze(item: FollowUp, minutes: number) {
    const dueAt = new Date(new Date().getTime() + minutes * 60_000);
    const updated = await send(item, { type: "reschedule", dueAt: dueAt.toISOString() });
    if (!updated) return;
    onSnoozed?.(updated);
    void refreshQueueCounts();
    const restorable = Date.parse(item.dueAt) > new Date().getTime() + 2 * 60_000;
    toast.success(`Snoozed until ${clockTime(dueAt.getTime())}.`, { duration: 5000, ...(restorable ? { action: { label: "Undo", onClick: () => void undo(updated, { type: "reschedule", dueAt: item.dueAt }, "Snooze undone.") } } : {}) });
    router.refresh();
  }

  return { send, undo, resolve, snooze, finish, mendedId, leavingId };
}
