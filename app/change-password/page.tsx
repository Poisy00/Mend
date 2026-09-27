import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/server/page-auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getPageSession();
  if (!session) redirect("/login");
  if (!session.mustChangePassword) redirect("/");
  return <ChangePasswordForm />;
}
