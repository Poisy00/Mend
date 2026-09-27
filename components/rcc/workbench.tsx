"use client";

import { useState } from "react";
import { VercelTabs } from "@/components/ui/vercel-tabs";
import { ExpediteForm } from "./expedite-form";
import { QuickFollowUp } from "./quick-follow-up";
import { TechnicianReview } from "./technician-review";
import type { RccInitialState } from "@/lib/rcc/initial-state";

type Tool = "expedite" | "technician-review" | "quick-follow-up";
const tools: { id: Tool; label: string }[] = [
  { id: "expedite", label: "Appointment expedite" },
  { id: "technician-review", label: "Technician review" },
  { id: "quick-follow-up", label: "Quick follow-up" },
];

export function RccWorkbench({ initialState }: { initialState: RccInitialState }) {
  const [active, setActive] = useState<Tool>("expedite");
  return <div>
    <VercelTabs tabs={tools} activeTab={active} onTabChange={id => setActive(id as Tool)} label="RCC workflows" />
    <section role="tabpanel" id={`rcc-panel-${active}`} aria-labelledby={`rcc-tab-${active}`} tabIndex={0}>
      {active === "expedite" ? <ExpediteForm initialDraft={initialState.expedite} initialPreferences={initialState.preferences} /> : active === "technician-review" ? <TechnicianReview initialDraft={initialState.technicianReview} initialPreferences={initialState.preferences} /> : <QuickFollowUp initialDraft={initialState.quickFollowUp} initialPreferences={initialState.preferences} />}
    </section>
  </div>;
}

