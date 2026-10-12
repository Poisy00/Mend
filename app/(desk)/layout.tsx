import { requirePageSession } from "@/lib/server/page-auth";
import { getSchedule } from "@/lib/server/schedule";
import { MendShell } from "@/components/mend-shell";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  const schedule = await getSchedule(session.id);
  return <MendShell user={{ displayName: session.displayName, role: session.role }} schedule={{ week: schedule.week, exceptions: schedule.exceptions, now: new Date().getTime() }}>{children}</MendShell>;
}
