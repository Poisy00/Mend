import { requireWorkspaceSession } from "@/lib/server/auth";
import { errorJson,json,requireSameOrigin } from "@/lib/server/http";
import { listAIThreads } from "@/lib/server/ai/threads";
export async function GET(request: Request) {
  const user = await requireWorkspaceSession(request);
  if (!user) return errorJson(401,"Authentication required");
  return json({ threads: await listAIThreads(user.id) });
}
export async function POST(request: Request) {
  try { requireSameOrigin(request); const user=await requireWorkspaceSession(request); if(!user)return errorJson(401,"Authentication required");
    const { createAIThread } = await import("@/lib/server/ai/threads");
    return json({ id: await createAIThread(user.id,"New conversation") },{ status: 201 });
  } catch { return errorJson(400,"Could not create conversation"); }
}
