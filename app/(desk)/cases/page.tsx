import { CaseQueue } from "@/components/cases/queue";
import { requirePageSession } from "@/lib/server/page-auth";
import { listCases } from "@/lib/server/cases";

export default async function CasesPage() {
  const session = await requirePageSession();
  const initialPage = await listCases(session.id, { limit: 50 });
  return <CaseQueue initialPage={initialPage} />;
}
