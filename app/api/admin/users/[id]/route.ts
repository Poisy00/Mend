import { z } from "zod";
import { getSession } from "@/lib/server/auth";
import { disableAgent, resetAgentPassword } from "@/lib/server/admin";
import { errorJson, json, parseJson, requireSameOrigin } from "@/lib/server/http";
const schema=z.discriminatedUnion("action",[z.object({action:z.literal("disable")}),z.object({action:z.literal("reset-password"),temporaryPassword:z.string().min(12).max(256)})]);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{requireSameOrigin(request);const user=await getSession(request);if(!user)return errorJson(401,"Authentication required");if(user.role!=="admin")return errorJson(403,"Administrator access required");const {id}=await params;const input=await parseJson(request,schema);if(input.action==="disable")await disableAgent(user.id,id);else await resetAgentPassword(user.id,id,input.temporaryPassword);return json({ok:true});}catch(error){return errorJson(400,error instanceof Error?error.message:"Unable to update agent");}}
