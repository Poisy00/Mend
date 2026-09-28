import { getSession } from "../../../../lib/server/auth";
import { errorJson, json } from "../../../../lib/server/http";

export async function GET(request: Request) {
  const session = await getSession(request, { touch: false });
  if (!session) return errorJson(401, "Authentication required");
  return json({
    user: {
      id: session.id,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
    },
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
  });
}
