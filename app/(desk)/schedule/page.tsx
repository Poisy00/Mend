import { WeeklyGrid } from "@/components/schedule/weekly-grid";
import { requirePageSession } from "@/lib/server/page-auth";
import { getSchedule } from "@/lib/server/schedule";

export default async function SchedulePage() {
  const session = await requirePageSession();
  const initialSchedule = await getSchedule(session.id);
  return <WeeklyGrid initialSchedule={initialSchedule} />;
}
