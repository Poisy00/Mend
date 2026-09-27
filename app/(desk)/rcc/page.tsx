import { RccWorkbench } from "@/components/rcc/workbench";
import { requirePageSession } from "@/lib/server/page-auth";
import { getRccDraft, getRccPreferences } from "@/lib/server/rcc";

export default async function RccPage() {
  const session = await requirePageSession();
  const [preferences, expedite, technicianReview, quickFollowUp] = await Promise.all([
    getRccPreferences(session.id),
    getRccDraft(session.id, "expedite"),
    getRccDraft(session.id, "technician-review"),
    getRccDraft(session.id, "quick-follow-up"),
  ]);
  return <RccWorkbench initialState={{ preferences, expedite, technicianReview, quickFollowUp }} />;
}
