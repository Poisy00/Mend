import { FollowUpForm } from "@/components/follow-ups/form";
import { requirePageSession } from "@/lib/server/page-auth";
import { getFollowUpDraft } from "@/lib/server/follow-ups";

export default async function NewFollowUpPage() {
  const session = await requirePageSession();
  const initialDraft = await getFollowUpDraft(session.id);
  return <FollowUpForm initialDraft={initialDraft} />;
}
