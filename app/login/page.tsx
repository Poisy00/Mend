import { getPageSession } from "@/lib/server/page-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getPageSession();
  if (session) redirect(session.mustChangePassword ? "/change-password" : "/");
  return <LoginForm />;
}
