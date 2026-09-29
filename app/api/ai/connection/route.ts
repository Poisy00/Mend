import { requireWorkspaceSession } from "@/lib/server/auth";
import { errorJson, json, requireSameOrigin } from "@/lib/server/http";
import { cancelAIConnection, disconnectAI, getAIConnection, pendingAIConnection, pollAIConnection, startAIConnection } from "@/lib/server/ai/connection";

export async function GET(request: Request) {
  const user = await requireWorkspaceSession(request);
  if (!user) return errorJson(401,"Authentication required");
  return json({ connection: await getAIConnection(user.id), pending: await pendingAIConnection(user) });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireWorkspaceSession(request);
    if (!user) return errorJson(401,"Authentication required");
    return json(await startAIConnection(user));
  } catch { return errorJson(503,"Could not start ChatGPT authorization"); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireWorkspaceSession(request);
    if (!user) return errorJson(401,"Authentication required");
    return json(await pollAIConnection(user));
  } catch { return errorJson(503,"Could not check ChatGPT authorization"); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireWorkspaceSession(request);
    if (!user) return errorJson(401,"Authentication required");
    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "cancel") await cancelAIConnection(user);
    else if (mode === "disconnect") await disconnectAI(user.id);
    else return errorJson(400,"Invalid action");
    return json({ success: true });
  } catch { return errorJson(400,"Could not change ChatGPT connection"); }
}
