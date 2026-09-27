"use client";

import { useState } from "react";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { ExpediteForm } from "./expedite-form";
import { QuickFollowUp } from "./quick-follow-up";
import { TechnicianReview } from "./technician-review";

type Tool = "expedite" | "technician-review" | "quick-follow-up";
const tools: { id: Tool; label: string }[] = [
  { id: "expedite", label: "Appointment expedite" },
  { id: "technician-review", label: "Technician review" },
  { id: "quick-follow-up", label: "Quick follow-up" },
];

export function RccWorkbench() {
  const [active, setActive] = useState<Tool>("expedite");
  return <div>
    <div className="border-b border-border pb-7"><p className="text-sm font-medium text-primary">RCC DESK</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Dispatch, with clarity.</h1><p className="mt-3 text-muted-foreground">Prepare the right draft, keep your working text private, and move to Outlook when ready.</p></div>
    <VercelTabs tabs={tools} activeTab={active} onTabChange={id => setActive(id as Tool)} label="RCC workflows" className="mt-3" />
    <section role="tabpanel" id={`rcc-panel-${active}`} aria-labelledby={`rcc-tab-${active}`} tabIndex={0}>
      {active === "expedite" ? <ExpediteForm /> : active === "technician-review" ? <TechnicianReview /> : <QuickFollowUp />}
    </section>
  </div>;
}

