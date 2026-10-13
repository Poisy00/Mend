"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FilterTabs } from "@/components/focus-line/filter-tabs";
import { ExpediteForm } from "./expedite-form";
import { QuickFollowUp } from "./quick-follow-up";
import { TechnicianReview } from "./technician-review";
import type { RccInitialState } from "@/lib/rcc/initial-state";

export type Tool = "expedite" | "technician-review" | "quick-follow-up";
const tools: { key: Tool; label: string }[] = [
  { key: "expedite", label: "Appointment expedite" },
  { key: "technician-review", label: "Technician review" },
  { key: "quick-follow-up", label: "Quick follow-up" },
];

export function RccWorkbench({ initialState, initialTool = "expedite" }: { initialState: RccInitialState; initialTool?: Tool }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<Tool>(initialTool);
  const choose = (id: Tool) => { setActive(id); router.replace(`${pathname}?tool=${id}`, { scroll: false }); };
  return <div>
    <FilterTabs variant="tabs" label="RCC workflows" tabs={tools} value={active} onChange={choose}
      tabProps={key => ({ id: `rcc-tab-${key}`, "aria-controls": `rcc-panel-${key}` })} />
    <section role="tabpanel" id={`rcc-panel-${active}`} aria-labelledby={`rcc-tab-${active}`} tabIndex={0} className="pt-6">
      {active === "expedite" ? <ExpediteForm initialDraft={initialState.expedite} initialPreferences={initialState.preferences} /> : active === "technician-review" ? <TechnicianReview initialDraft={initialState.technicianReview} initialPreferences={initialState.preferences} /> : <QuickFollowUp initialDraft={initialState.quickFollowUp} initialPreferences={initialState.preferences} />}
    </section>
  </div>;
}
