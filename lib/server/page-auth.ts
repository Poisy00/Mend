import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionByToken } from "@/lib/server/auth";
import { SESSION_COOKIE } from "@/lib/server/http";

export const getPageSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionByToken(token);
});

export async function requirePageSession() {
  const session = await getPageSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");
  return session;
}
