import { CaseQueue } from "@/components/cases/queue";
import { requirePageSession } from "@/lib/server/page-auth";
import { getCase, listCases } from "@/lib/server/cases";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const session = await requirePageSession();
  const { selected } = await searchParams;
  const [initialPage, initialSelected] = await Promise.all([
    listCases(session.id, { limit: 50 }),
    selected && /^[\w-]{1,64}$/.test(selected) ? getCase(session.id, selected) : null,
  ]);
  return <CaseQueue initialPage={initialPage} initialSelected={initialSelected} />;
}
