import { RccWorkbench } from "@/components/rcc/workbench";
import { requirePageSession } from "@/lib/server/page-auth";
import { getRccDraft, getRccPreferences } from "@/lib/server/rcc";

const tools = ["expedite", "technician-review", "quick-follow-up"] as const;

export default async function RccPage({ searchParams }: { searchParams: Promise<{ tool?: string }> }) {
  const session = await requirePageSession();
  const { tool } = await searchParams;
  const initialTool = tools.find(id => id === tool) ?? "expedite";
  const [preferences, expedite, technicianReview, quickFollowUp] = await Promise.all([
    getRccPreferences(session.id),
    getRccDraft(session.id, "expedite"),
    getRccDraft(session.id, "technician-review"),
    getRccDraft(session.id, "quick-follow-up"),
  ]);
  return <RccWorkbench initialTool={initialTool} initialState={{ preferences, expedite, technicianReview, quickFollowUp }} />;
}
