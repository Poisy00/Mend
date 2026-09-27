import { requirePageSession } from "@/lib/server/page-auth";
import { MendShell } from "@/components/mend-shell";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  await requirePageSession();
  return <MendShell>{children}</MendShell>;
}
