import { bindings } from "./runtime";
import { decryptCustomerValue, encryptCustomerValue } from "./crypto";
import { resolveExpediteRoute } from "../rcc/expedite-routing";
import { assessExpedite } from "../rcc/expedite-readiness";
import { buildExpediteEmail } from "../rcc/expedite-email";
import type { EmailDraft,ExpediteInput,RccPreferences,RccWorkflow } from "../rcc/types";
import { DEFAULT_RCC_PREFERENCES } from "../rcc/expedite-templates";
import { buildQuickFollowUp, type QuickFollowUpInput } from "../rcc/quick-follow-up";
import { mergeReviewWithDefaults, getTechnicalBlockers } from "../rcc/technician-review/model.js";
import { deriveDraftStatus } from "../rcc/technician-review/draft.js";
import { composeReviewEmail, renderReviewEmailHtml } from "../rcc/technician-review/email.js";

const emptyPrefs:RccPreferences=DEFAULT_RCC_PREFERENCES;
export async function getRccPreferences(ownerUserId:string):Promise<RccPreferences>{const row=await bindings().DB.prepare("SELECT settings_encrypted FROM rcc_preferences WHERE owner_user_id=?").bind(ownerUserId).first<{settings_encrypted:string}>();return row?JSON.parse(await decryptCustomerValue(row.settings_encrypted)):emptyPrefs;}
export async function saveRccPreferences(ownerUserId:string,prefs:RccPreferences){const encrypted=await encryptCustomerValue(JSON.stringify(prefs));await bindings().DB.prepare("INSERT INTO rcc_preferences (owner_user_id,settings_encrypted) VALUES (?,?) ON CONFLICT(owner_user_id) DO UPDATE SET settings_encrypted=excluded.settings_encrypted,updated_at=CURRENT_TIMESTAMP").bind(ownerUserId,encrypted).run();}
export async function getRccDraft(ownerUserId:string,workflow:RccWorkflow){const row=await bindings().DB.prepare("SELECT payload_encrypted,revision FROM rcc_drafts WHERE owner_user_id=? AND workflow=?").bind(ownerUserId,workflow).first<{payload_encrypted:string;revision:number}>();return row?{payload:JSON.parse(await decryptCustomerValue(row.payload_encrypted)),revision:row.revision}:null;}
export async function saveRccDraft(ownerUserId:string,workflow:RccWorkflow,payload:unknown,expectedRevision:number){const db=bindings().DB;const current=await db.prepare("SELECT revision FROM rcc_drafts WHERE owner_user_id=? AND workflow=?").bind(ownerUserId,workflow).first<{revision:number}>();if((current?.revision??0)!==expectedRevision)throw new Error("STALE_REVISION");const encrypted=await encryptCustomerValue(JSON.stringify(payload));if(current){const result=await db.prepare("UPDATE rcc_drafts SET payload_encrypted=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE owner_user_id=? AND workflow=? AND revision=?").bind(encrypted,ownerUserId,workflow,expectedRevision).run();if(result.meta.changes!==1)throw new Error("STALE_REVISION");return current.revision+1;}await db.prepare("INSERT INTO rcc_drafts (owner_user_id,workflow,payload_encrypted,revision) VALUES (?,?,?,1)").bind(ownerUserId,workflow,encrypted).run();return 1;}
export type PreparedHandoff={id:string;workflow:RccWorkflow;status:"prepared";draft:EmailDraft;createdAt:string};
export async function prepareRccHandoff(ownerUserId:string,workflow:RccWorkflow,draftRevision:number):Promise<PreparedHandoff>{const saved=await getRccDraft(ownerUserId,workflow);if(!saved)throw new Error("DRAFT_NOT_FOUND");if(saved.revision!==draftRevision)throw new Error("STALE_REVISION");let draft:EmailDraft;
 if(workflow==="expedite"){const input=saved.payload as ExpediteInput;const prefs=await getRccPreferences(ownerUserId);const route=resolveExpediteRoute(input,new Date());const readiness=assessExpedite(input,prefs,route);if(!readiness.ready)throw new Error(readiness.blockers.join("; "));draft=buildExpediteEmail(input,prefs,route);}
 else if(workflow==="quick-follow-up"){
  const input=(saved.payload as {input?:QuickFollowUpInput})?.input;
  if(!input||typeof input.recipient!=="string"||typeof input.name!=="string"||typeof input.note!=="string"||typeof input.callbackScheduled!=="boolean"||typeof input.callbackDate!=="string"||typeof input.callbackTime!=="string")throw new Error("DRAFT_NOT_READY");
  if(input.recipient&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.recipient))throw new Error("Recipient email is invalid");
  draft=buildQuickFollowUp(input,new Date());
 }else{
  const raw=(saved.payload as {review?:unknown})?.review;
  if(!raw||typeof raw!=="object")throw new Error("DRAFT_NOT_READY");
  const review=mergeReviewWithDefaults(raw);
  const prefs=await getRccPreferences(ownerUserId);
  const blockers=getTechnicalBlockers(review,prefs.longIslandEmail);
  if(blockers.length)throw new Error(blockers[0].label);
  if(deriveDraftStatus(review).stale)throw new Error("Review facts changed. Refresh the draft before handoff.");
  const composed=composeReviewEmail(review,{name:prefs.name});
  const body=review.draft?.body||composed.body;
  draft={to:prefs.longIslandEmail,subject:composed.subject,plain:body,html:renderReviewEmailHtml({...composed,body})};
 }
 const id=crypto.randomUUID(),createdAt=new Date().toISOString();await bindings().DB.prepare("INSERT INTO rcc_handoffs (id,owner_user_id,workflow,snapshot_encrypted,source_encrypted,status,created_at) VALUES (?,?,?,?,?,'prepared',?)").bind(id,ownerUserId,workflow,await encryptCustomerValue(JSON.stringify(draft)),await encryptCustomerValue(JSON.stringify(saved.payload)),createdAt).run();return {id,workflow,status:"prepared",draft,createdAt};}
export async function getRccHandoff(ownerUserId:string,id:string){const row=await bindings().DB.prepare("SELECT workflow,snapshot_encrypted,status,created_at FROM rcc_handoffs WHERE owner_user_id=? AND id=?").bind(ownerUserId,id).first<{workflow:RccWorkflow;snapshot_encrypted:string;status:"prepared";created_at:string}>();return row?{id,workflow:row.workflow,status:row.status,createdAt:row.created_at,draft:JSON.parse(await decryptCustomerValue(row.snapshot_encrypted)) as EmailDraft}:null;}
export async function getLastRccHandoffSource(ownerUserId:string,workflow:RccWorkflow){const row=await bindings().DB.prepare("SELECT source_encrypted,created_at FROM rcc_handoffs WHERE owner_user_id=? AND workflow=? AND source_encrypted IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1").bind(ownerUserId,workflow).first<{source_encrypted:string;created_at:string}>();return row?{payload:JSON.parse(await decryptCustomerValue(row.source_encrypted)),createdAt:row.created_at}:null;}
