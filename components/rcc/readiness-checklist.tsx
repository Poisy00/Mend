"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { appointmentWindow } from "@/lib/rcc/expedite-templates";
import type { ExpediteInput, RouteDecision } from "@/lib/rcc/types";

type ItemKey = "account" | "phone" | "date" | "window" | "reason" | "summary" | "action" | "recipient";

/** Maps each blocker message from `assessExpedite` to the checklist item it belongs to. */
function blockerItem(message: string): ItemKey | null {
  switch (message) {
    case "Add the account number": case "Enter a 13-digit account number": return "account";
    case "Add a callback number": case "Enter a 10-digit callback number": return "phone";
    case "Choose an appointment date": case "The appointment date is in the past": case "Nassau must start from the next date": return "date";
    case "Enter a custom appointment window": case "Choose an appointment window": return "window";
    case "Choose a reason for expedite": return "reason";
    case "Add the case summary": return "summary";
    case "Add the requested action": return "action";
  }
  return message.startsWith("Configure the ") ? "recipient" : null;
}

/** The shared iris mark. It animates only when `met` flips from false to true after the first render. */
export function CheckMark({ met, attempted = false }: { met: boolean; attempted?: boolean }) {
  const [previous, setPrevious] = useState(met);
  const [animate, setAnimate] = useState(false);
  if (previous !== met) { setPrevious(met); setAnimate(met); }
  return <span aria-hidden="true" className="mend-check" data-state={met ? "met" : attempted ? "attempted" : "unmet"} data-animate={animate}>
    <svg viewBox="0 0 16 16"><path d="M4.6 8.4 7 10.8l4.4-5" pathLength={1} /></svg>
  </span>;
}

export function ReadinessChecklist({ blockers, route, values, recipient, attempted }: {
  blockers: string[]; route: RouteDecision; values: ExpediteInput; recipient: string; attempted: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const unmet = new Map<ItemKey, string>();
  for (const message of blockers) {
    const key = blockerItem(message);
    if (key && !unmet.has(key)) unmet.set(key, message);
  }
  const hasValue: Record<ItemKey, boolean> = {
    account: !!values.account.trim(), phone: !!values.phone.trim(), date: !!values.date,
    window: !!appointmentWindow(values), reason: !!values.reason.trim(), summary: !!values.summary.trim(), action: !!values.action.trim(),
    recipient: !!recipient.trim(),
  };
  const items: { key: ItemKey; label: string }[] = [
    { key: "account", label: "Account number" },
    { key: "phone", label: "Callback number" },
    { key: "date", label: "Appointment date" },
    { key: "window", label: "Appointment window" },
    { key: "reason", label: "Reason" },
    { key: "summary", label: "Case summary" },
    { key: "action", label: "Action requested" },
    { key: "recipient", label: `${route.id === "long-island" ? "Long Island" : "Nassau"} recipient` },
  ];
  const ready = items.filter(item => !unmet.has(item.key)).length;
  const unmetItems = items.filter(item => unmet.has(item.key));
  return <section aria-labelledby="rcc-readiness-heading">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <h3 id="rcc-readiness-heading" className="t-meta shrink-0 font-semibold text-text-secondary"><span className="num">{ready}</span> of <span className="num">{items.length}</span> ready</h3>
      <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 min-[1100px]:flex">
        {unmetItems.length === 0
          ? <span className="t-body inline-flex items-center gap-2 text-text-secondary"><CheckMark met />Ready to send</span>
          : unmetItems.map(({ key, label }) => {
            const alert = attempted;
            return <span key={key} className={cn("t-body inline-flex items-center gap-1.5", alert ? "text-status-overdue" : "text-text-primary")}><CheckMark met={false} attempted={alert} /><span className="sr-only">Needs attention: </span>{label}</span>;
          })}
      </div>
      <button type="button" aria-expanded={expanded} aria-controls="rcc-readiness-list" onClick={() => setExpanded(value => !value)} className="t-meta hidden h-8 shrink-0 rounded-md px-2 font-semibold text-primary hover-fine:bg-accent min-[1100px]:inline-flex min-[1100px]:items-center">{expanded ? "Hide all" : "Show all"}</button>
    </div>
    <ul id="rcc-readiness-list" className={cn("mt-2 grid gap-x-4 sm:grid-cols-2 min-[1100px]:max-h-[calc((100dvh-3rem)*.4)] min-[1100px]:overflow-auto", !expanded && "min-[1100px]:hidden")}>
      {items.map(({ key, label }) => {
        const met = !unmet.has(key);
        const alert = !met && attempted;
        const caption = !met && hasValue[key] ? unmet.get(key) : undefined;
        return <li key={key} className="flex min-h-8 items-start gap-2 py-1.5">
          <span className="mt-0.5"><CheckMark met={met} attempted={alert} /></span>
          <span className="min-w-0">
            <span className={cn("t-body block", met ? "text-text-secondary" : alert ? "text-status-overdue" : "text-text-primary")}><span className="sr-only">{met ? "Ready: " : "Needs attention: "}</span>{label}</span>
            {caption && <span className={cn("t-caption block", alert ? "text-status-overdue" : "text-text-secondary")}>{caption}</span>}
          </span>
        </li>;
      })}
    </ul>
  </section>;
}
