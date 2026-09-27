import { z } from "zod";import { requireWorkspaceSession } from "@/lib/server/auth";import { getRccPreferences,saveRccPreferences } from "@/lib/server/rcc";import { errorJson,json,parseJson,requireSameOrigin } from "@/lib/server/http";
const schema=z.object({longIslandEmail:z.string().max(250),nassauEmail:z.string().max(250),signature:z.string().max(500),name:z.string().max(100)}).strict();
export async function GET(request:Request){const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");return json({preferences:await getRccPreferences(user.id)});}
export async function PUT(request:Request){try{requireSameOrigin(request);const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");const prefs=await parseJson(request,schema);await saveRccPreferences(user.id,prefs);return json({ok:true});}catch{return errorJson(400,"Unable to save preferences");}}

