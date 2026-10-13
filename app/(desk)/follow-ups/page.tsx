import { FollowUpQueue } from "@/components/follow-ups/queue";
import { requirePageSession } from "@/lib/server/page-auth";
import { getFollowUp, listFollowUps } from "@/lib/server/follow-ups";

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const session = await requirePageSession();
  const { selected } = await searchParams;
  const [initialPage, initialSelected] = await Promise.all([
    listFollowUps(session.id, { limit: 50 }),
    selected && /^[\w-]{1,64}$/.test(selected) ? getFollowUp(session.id, selected) : null,
  ]);
  return <FollowUpQueue initialPage={initialPage} initialSelected={initialSelected} now={new Date().getTime()} />;
}
