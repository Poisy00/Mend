import { z } from "zod";
import { login } from "../../../../lib/server/auth";
import { errorJson, json, parseJson, requireSameOrigin, sessionCookie } from "../../../../lib/server/http";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
}).strict();

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const payload = await parseJson(request, loginSchema);
    const result = await login(payload.username, payload.password, request);
    if (!result) return errorJson(401, "Invalid username or password");
    const response = json({
      user: {
        username: result.user.username,
        displayName: result.user.display_name,
        role: result.user.role,
        mustChangePassword: Boolean(result.user.must_change_password),
      },
    });
    response.headers.append("set-cookie", sessionCookie(result.session.rawToken, result.session.maxAge));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BOOTSTRAP_CONFIGURATION")) {
      return errorJson(503, "Mend has not been configured by its administrator");
    }
    return errorJson(400, "Unable to process login");
  }
}

