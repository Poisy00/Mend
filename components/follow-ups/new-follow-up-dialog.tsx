"use client";

import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { FollowUp } from "@/lib/follow-ups/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { refreshQueueCounts } from "@/components/use-queue-counts";
import { FollowUpForm, type FollowUpDraft } from "./form";

type Load = { status: "loading" } | { status: "ready"; draft: FollowUpDraft | null };

/** Field placeholders shown while the saved draft loads. */
function DialogFormSkeleton() {
  return <>
    <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5" role="status" aria-label="Loading your draft">
      <div className="space-y-3" aria-hidden="true"><Skeleton className="h-3 w-24" /><Skeleton className="h-[52px] w-full rounded-[14px]" /></div>
      {[4, 5, 3].map((fields, section) => <div key={section} className="space-y-4" aria-hidden="true">
        <Skeleton className="h-3 w-20" />
        <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">{Array.from({ length: fields }, (_, index) => <div key={index} className="space-y-2.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-full rounded-[10px]" /></div>)}</div>
      </div>)}
    </div>
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-sheet px-6 py-4" aria-hidden="true"><Skeleton className="h-9 w-20 rounded-md" /><Skeleton className="h-9 w-36 rounded-md" /></div>
  </>;
}

/** Mounts only while the dialog is open, so every open fetches the current draft. */
function DialogBody({ onCreated }: { onCreated: (item?: FollowUp) => void }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  useEffect(() => {
    let active = true;
    fetch("/api/follow-ups/draft", { cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ draft: FollowUpDraft | null }>; })
      .then(data => { if (active) setLoad({ status: "ready", draft: data.draft }); })
      .catch(() => { if (active) { toast.error("Your saved draft could not be loaded"); setLoad({ status: "ready", draft: null }); } });
    return () => { active = false; };
  }, []);
  if (load.status === "loading") return <DialogFormSkeleton />;
  return <FollowUpForm variant="dialog" initialDraft={load.draft} onCreated={onCreated} />;
}

/**
 * The "New follow-up" button and its dialog. After a successful create the dialog closes and `onCreated` runs;
 * by default that refreshes the current page's data and the sidebar counts. The /follow-ups/new route still renders the page form.
 */
export function NewFollowUpTrigger({ children, onCreated, ...buttonProps }: Omit<ComponentProps<typeof Button>, "onClick" | "type"> & { onCreated?: (item?: FollowUp) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLAnchorElement>(null);
  // A real link: a plain left click opens the dialog, while Ctrl, Cmd, Shift, Alt and middle clicks open the page natively.
  function openFromLink(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setOpen(true);
  }
  function created(item?: FollowUp) {
    setOpen(false);
    if (onCreated) onCreated(item);
    else router.refresh();
    void refreshQueueCounts();
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <Button asChild {...buttonProps}><a ref={anchor} href="/follow-ups/new" aria-haspopup="dialog" onClick={openFromLink}>{children ?? <><Plus />New follow-up</>}</a></Button>
    <DialogContent showCloseButton overlayClassName="mend-dialog-overlay" onCloseAutoFocus={event => { event.preventDefault(); anchor.current?.focus(); }}
      className="mend-dialog flex max-h-[min(860px,calc(100dvh-4rem))] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-[14px] border-0 bg-sheet p-0 shadow-overlay sm:max-w-[680px] max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
      <DialogHeader className="shrink-0 gap-1 border-b border-border px-6 py-4 pr-14">
        <DialogTitle className="t-heading">New follow-up</DialogTitle>
        <DialogDescription className="t-meta">Capture what to call about and when.</DialogDescription>
      </DialogHeader>
      <DialogBody onCreated={created} />
    </DialogContent>
  </Dialog>;
}
