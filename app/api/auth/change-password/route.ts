import { z } from "zod";
import { changeOwnPassword, requireSession } from "../../../../lib/server/auth";
import { errorJson, json, parseJson, requireSameOrigin, sessionCookie } from "../../../../lib/server/http";

const schema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
}).strict();

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await requireSession(request);
    if (!session) return errorJson(401, "Authentication required");
    const payload = await parseJson(request, schema);
    const nextSession = await changeOwnPassword(session, payload.currentPassword, payload.newPassword, request);
    if (!nextSession) return errorJson(400, "Current password is incorrect");
    const response = json({ ok: true });
    response.headers.append("set-cookie", sessionCookie(nextSession.rawToken, nextSession.maxAge));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("12 characters")) return errorJson(400, error.message);
    return errorJson(400, "Unable to change password");
  }
}
