import { requireWorkspaceSession } from "@/lib/server/auth";
import { errorJson,json,requireSameOrigin } from "@/lib/server/http";
import { deleteAIThread,getAIThread } from "@/lib/server/ai/threads";
type Params={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Params){const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");const thread=await getAIThread(user.id,(await params).id);return thread?json({thread}):errorJson(404,"Conversation not found");}
export async function DELETE(request:Request,{params}:Params){try{requireSameOrigin(request);const user=await requireWorkspaceSession(request);if(!user)return errorJson(401,"Authentication required");return (await deleteAIThread(user.id,(await params).id))?json({success:true}):errorJson(404,"Conversation not found");}catch{return errorJson(400,"Could not delete conversation");}}
