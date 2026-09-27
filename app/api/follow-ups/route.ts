import { z } from "zod";
import { requireWorkspaceSession } from "@/lib/server/auth";
import { createFollowUp, listFollowUps } from "@/lib/server/follow-ups";
import { errorJson, json, parseJson, requireSameOrigin } from "@/lib/server/http";
const schema=z.object({customerName:z.string().trim().min(1).max(120),accountNumber:z.string().trim().min(1).max(80),phoneNumber:z.string().trim().min(1).max(80),reason:z.string().trim().min(1).max(120),priority:z.enum(["normal","urgent"]),dueAt:z.string().datetime(),sourceTimezone:z.enum(["Africa/Cairo","America/New_York"]),notes:z.string().max(3000).optional()}).strict();
export async function GET(request:Request){const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");const search=new URL(request.url).searchParams;return json(await listFollowUps(user.id,{search:search.get("search")??undefined,limit:Number(search.get("limit")??50),cursor:search.get("cursor")??undefined}));}
export async function POST(request:Request){try{requireSameOrigin(request);const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");const input=await parseJson(request,schema);return json({item:await createFollowUp(user.id,input)},{status:201});}catch(error){return errorJson(400,error instanceof Error?error.message:"Unable to create follow-up");}}
