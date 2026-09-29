import { requireWorkspaceSession } from "@/lib/server/auth";
import { errorJson, json } from "@/lib/server/http";
import { aiProvider } from "@/lib/server/ai/connection";

export async function GET(request: Request) {
  const user = await requireWorkspaceSession(request);
  if (!user) return errorJson(401,"Authentication required");
  try { return json({ models: await (await aiProvider(user.id)).listModels() }); }
  catch { return errorJson(409,"Reconnect ChatGPT to see available models"); }
}
