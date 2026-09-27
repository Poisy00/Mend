import { followUpProfileSchema } from "@/lib/follow-ups/schema";
import { requireWorkspaceSession } from "@/lib/server/auth";
import { createFollowUp, listFollowUps } from "@/lib/server/follow-ups";
import { errorJson, json, parseJson, requireSameOrigin } from "@/lib/server/http";
export async function GET(request:Request){const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");const search=new URL(request.url).searchParams;return json(await listFollowUps(user.id,{search:search.get("search")??undefined,limit:Number(search.get("limit")??50),cursor:search.get("cursor")??undefined}));}
export async function POST(request:Request){try{requireSameOrigin(request);const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");const input=await parseJson(request,followUpProfileSchema);return json({item:await createFollowUp(user.id,input)},{status:201});}catch(error){return errorJson(400,error instanceof Error?error.message:"Unable to create follow-up");}}
