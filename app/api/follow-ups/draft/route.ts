import { getSession } from "@/lib/server/auth";
import { getFollowUpDraft, saveFollowUpDraft } from "@/lib/server/follow-ups";
import { errorJson, json, requireSameOrigin } from "@/lib/server/http";
export async function GET(request:Request){const user=await getSession(request);if(!user)return errorJson(401,"Authentication required");return json({draft:await getFollowUpDraft(user.id)});}
export async function PUT(request:Request){try{requireSameOrigin(request);const user=await getSession(request);if(!user)return errorJson(401,"Authentication required");const {payload,expectedRevision}=await request.json() as {payload:unknown;expectedRevision?:number};return json({revision:await saveFollowUpDraft(user.id,payload,expectedRevision)});}catch(error){if(error instanceof Error&&error.message==="STALE_REVISION")return errorJson(409,"Draft changed elsewhere");return errorJson(400,"Unable to save draft");}}
