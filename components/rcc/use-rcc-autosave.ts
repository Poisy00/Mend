"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Workflow = "quick-follow-up" | "technician-review";

export function useRccAutosave(workflow: Workflow, payload: unknown, ready: boolean, initialRevision = 0) {
  const revision = useRef(initialRevision);
  const lastSaved = useRef(JSON.stringify(payload));
  const queue = useRef<Promise<number>>(Promise.resolve(0));
  const [saving, setSaving] = useState(false);
  const serialized = JSON.stringify(payload);

  const hydrate = useCallback((savedRevision: number, savedPayload: unknown) => {
    revision.current = savedRevision;
    lastSaved.current = JSON.stringify(savedPayload);
  }, []);

  const saveNow = useCallback((nextPayload: unknown) => {
    const snapshot = JSON.stringify(nextPayload);
    const save = async () => {
      if (snapshot === lastSaved.current) return revision.current;
      setSaving(true);
      try {
        const response = await fetch(`/api/rcc/drafts/${workflow}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payload: nextPayload, expectedRevision: revision.current }),
        });
        const result = await response.json() as { revision?: number; error?: string };
        if (!response.ok || result.revision === undefined) throw new Error(result.error ?? "Unable to save draft");
        revision.current = result.revision;
        lastSaved.current = snapshot;
        return result.revision;
      } finally {
        setSaving(false);
      }
    };
    queue.current = queue.current.then(save, save);
    return queue.current;
  }, [workflow]);

  useEffect(() => {
    if (!ready || serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      void saveNow(JSON.parse(serialized)).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Draft could not be saved");
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [ready, serialized, saveNow]);

  return { hydrate, saveNow, saving };
}
