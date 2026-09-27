import { cookies } from "next/headers";
import { getSessionByToken } from "@/lib/server/auth";
import { SESSION_COOKIE } from "@/lib/server/http";

export async function getPageSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionByToken(token);
}
