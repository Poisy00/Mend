import { z } from "zod";
import { recoverAdministrator } from "../../../../lib/server/auth";
import { errorJson, json, parseJson, requireSameOrigin, sessionCookie } from "../../../../lib/server/http";

const schema = z.object({ password: z.string().min(12).max(256), recoveryToken: z.string().min(32) }).strict();

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { password, recoveryToken } = await parseJson(request, schema);
    const session = await recoverAdministrator(password, recoveryToken, request);
    if (!session) return errorJson(403, "Recovery is unavailable");
    const response = json({ ok: true });
    response.headers.append("set-cookie", sessionCookie(session.rawToken, session.maxAge));
    return response;
  } catch {
    return errorJson(400, "Unable to reset password");
  }
}
