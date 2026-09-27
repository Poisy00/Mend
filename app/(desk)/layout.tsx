import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/server/page-auth";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");
  return children;
}
