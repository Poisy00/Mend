import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/server/auth";
import { createAgent, listAgents } from "@/lib/server/admin";
import { errorJson, json, parseJson, requireSameOrigin } from "@/lib/server/http";
const schema=z.object({username:z.string().min(3).max(64),displayName:z.string().min(1).max(100),temporaryPassword:z.string().min(12).max(256)}).strict();
export async function GET(request:Request){const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");if(user.role!=="admin")return errorJson(403,"Administrator access required");return json({users:await listAgents(user.id)});}
export async function POST(request:Request){try{requireSameOrigin(request);const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");if(user.role!=="admin")return errorJson(403,"Administrator access required");const input=await parseJson(request,schema);return json({user:await createAgent(user.id,input)},{status:201});}catch(error){return errorJson(400,error instanceof Error?error.message:"Unable to create agent");}}
