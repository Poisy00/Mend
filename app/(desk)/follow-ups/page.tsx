import { FollowUpQueue } from "@/components/follow-ups/queue";
import { requirePageSession } from "@/lib/server/page-auth";
import { listFollowUps } from "@/lib/server/follow-ups";

export default async function FollowUpsPage() {
  const session = await requirePageSession();
  const initialPage = await listFollowUps(session.id, { limit: 50 });
  return <FollowUpQueue initialPage={initialPage} />;
}
