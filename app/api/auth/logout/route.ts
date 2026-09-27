import { revokeCurrentSession } from "../../../../lib/server/auth";
import { clearSessionCookie, errorJson, json, requireSameOrigin } from "../../../../lib/server/http";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await revokeCurrentSession(request);
    const response = json({ ok: true });
    response.headers.append("set-cookie", clearSessionCookie());
    return response;
  } catch {
    return errorJson(400, "Unable to log out");
  }
}
