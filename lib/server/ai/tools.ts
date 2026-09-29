import { tool } from "ai";
import { z } from "zod";
import { getCase, listCases, createCaseFromWorkflow } from "../cases";
import { getFollowUp, createFollowUp, applyFollowUpCommand } from "../follow-ups";
import { getRccDraft, saveRccDraft } from "../rcc";
import type { MendAIContext } from "./context";

function redact(value: string, secrets: string[]) {
  return secrets.filter(Boolean).reduce((text, secret) => text.replaceAll(secret,"[customer detail]"),value);
}
function caseSummary(item: NonNullable<Awaited<ReturnType<typeof getCase>>>) {
  return { id: item.id, humanId: item.humanId, summary: redact(item.summary,[item.customerName,item.accountNumber]),
    category: item.category, status: item.status, priority: item.priority, revision: item.revision };
}
function followUpSummary(item: NonNullable<Awaited<ReturnType<typeof getFollowUp>>>) {
  return { id: item.id, reason: redact(item.reason,[item.customerName,item.accountNumber,item.phoneNumber]),
    notes: redact(item.notes,[item.customerName,item.accountNumber,item.phoneNumber]), dueAt: item.dueAt,
    status: item.status, priority: item.priority, revision: item.revision };
}

export function mendTools(ownerUserId: string, context: MendAIContext) {
  return {
    get_current_context: tool({ description: "Get the current Mend area and intentionally shared operational context.",
      inputSchema: z.object({}).strict(), execute: async () => context }),
    get_case: tool({ description: "Read an owned Mend case by internal UUID, without customer identifiers.",
      inputSchema: z.object({ id: z.string().uuid() }), execute: async ({ id }) => { const item=await getCase(ownerUserId,id); return item?caseSummary(item):{error:"Case not found"}; } }),
    search_cases: tool({ description: "Find the user's cases by problem text or Mend ID. Results omit customer identifiers.",
      inputSchema: z.object({ query: z.string().max(120) }), execute: async ({ query }) => {
        const page=await listCases(ownerUserId,{ search: query, limit: 10 });
        return page.items.map(caseSummary);
      } }),
    get_rcc_draft: tool({ description: "Read the user's current RCC draft by workflow; return operational text only.",
      inputSchema: z.object({ workflow: z.enum(["expedite","technician-review","quick-follow-up"]) }),
      execute: async ({ workflow }) => { const draft=await getRccDraft(ownerUserId,workflow); if(!draft)return {error:"Draft not found"};
        if(workflow==="expedite") { const value=draft.payload as {reason?:string;summary?:string;action?:string;customerName?:string;account?:string;phone?:string};
          const secrets=[value.customerName??"",value.account??"",value.phone??""];
          return { workflow, revision:draft.revision, reason:redact(value.reason??"",secrets), summary:redact(value.summary??"",secrets), action:redact(value.action??"",secrets) }; }
        return { workflow, revision:draft.revision, message:"This workflow's structured draft is available for explicit user selection only." }; } }),
    update_rcc_draft: tool({ description: "Change the reason, summary or action in the user's saved expedite draft. Requires its revision.",
      inputSchema: z.object({ workflow:z.literal("expedite"), expectedRevision:z.number().int().nonnegative(), reason:z.string().max(2000).optional(), summary:z.string().max(2000).optional(), action:z.string().max(2000).optional() }).refine(value=>Boolean(value.reason!==undefined||value.summary!==undefined||value.action!==undefined)),
      execute: async input => { const current=await getRccDraft(ownerUserId,input.workflow);if(!current)return {error:"Draft not found"};
        if(current.revision!==input.expectedRevision)return {error:"Draft changed. Read it again before editing."};
        const value=current.payload as Record<string,unknown>;
        const revision=await saveRccDraft(ownerUserId,input.workflow,{...value,...(input.reason!==undefined?{reason:input.reason}:{}),...(input.summary!==undefined?{summary:input.summary}:{}),...(input.action!==undefined?{action:input.action}:{})},input.expectedRevision);
        return {success:true,revision}; } }),
    get_followup: tool({ description: "Read an owned follow-up by internal UUID, without customer identifiers.",
      inputSchema:z.object({id:z.string().uuid()}),execute:async({id})=>{const item=await getFollowUp(ownerUserId,id);return item?followUpSummary(item):{error:"Follow-up not found"};} }),
    create_followup: tool({ description: "Schedule a follow-up using the identifiers already saved in the user's active RCC expedite draft. Do not invent contact information.",
      inputSchema:z.object({workflow:z.literal("expedite"),dueAt:z.string().datetime({offset:true}),reason:z.string().min(1).max(500),notes:z.string().max(2000).optional()}),
      execute:async({workflow,dueAt,reason,notes})=>{const draft=await getRccDraft(ownerUserId,workflow);if(!draft)return {error:"No saved RCC draft"};
        const value=draft.payload as {account?:string;phone?:string;customerName?:string};
        if(!value.account||!value.phone)return {error:"The saved draft needs an account and callback number"};
        const item=await createFollowUp(ownerUserId,{customerName:value.customerName??"",accountNumber:value.account,phoneNumber:value.phone,reason,notes,
          priority:"normal",dueAt,sourceTimezone:"Africa/Cairo"});return {success:true,id:item.id,dueAt:item.dueAt};} }),
    update_followup: tool({description:"Reschedule an owned follow-up using its current revision.",
      inputSchema:z.object({id:z.string().uuid(),expectedRevision:z.number().int().positive(),dueAt:z.string().datetime({offset:true})}),
      execute:async({id,expectedRevision,dueAt})=>{const result=await applyFollowUpCommand(ownerUserId,id,{type:"reschedule",dueAt},expectedRevision);
        return result?{success:true,id:result.id,dueAt:result.dueAt,revision:result.revision}:{error:"Follow-up not found"};} }),
    save_case: tool({description:"Save the current owned RCC handoff as a Mend case. Requires an existing handoff ID and explicit summary.",
      inputSchema:z.object({handoffId:z.string().uuid(),summary:z.string().min(1).max(3000),category:z.enum(["Appointment","Service","Technician visit","Escalation","Other"]),priority:z.enum(["High","Medium","Low"])}),
      execute:async({handoffId,summary,category,priority})=>{const {getRccHandoffSource}=await import("../rcc");const source=await getRccHandoffSource(ownerUserId,handoffId);
        if(!source)return {error:"Handoff not found"};
        if(source.workflow!=="expedite")return {error:"Only expedite handoffs can currently be saved through Ask Mend"};
        const details=source.payload as {customerName?:string;account?:string};
        if(!details.customerName?.trim()&&!details.account?.trim())return {error:"The handoff needs a customer name or account number"};
        const item=await createCaseFromWorkflow(ownerUserId,{customerName:details.customerName??"",accountNumber:details.account??"",summary,category,priority,source:{type:"rcc-handoff",id:handoffId}});
        return {success:true,id:item.id,humanId:item.humanId};} }),
  };
}
