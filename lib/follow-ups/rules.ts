import type { FollowUp, FollowUpBucket, FollowUpCommand, FollowUpEvent } from "./types";
const addMinutes=(date:Date,minutes:number)=>new Date(date.getTime()+minutes*60_000).toISOString();
export function classifyFollowUp(item:FollowUp,nowMs:number):FollowUpBucket {
  if(item.completedAt||["completed","abandoned","cancelled"].includes(item.status))return "completed";
  const minutes=(Date.parse(item.dueAt)-nowMs)/60_000;
  if(minutes<0)return "overdue";if(minutes<=5)return "now";if(minutes<=60)return "soon";return "waiting";
}
export function rankFollowUp(item:FollowUp,nowMs:number){
  if(classifyFollowUp(item,nowMs)==="completed")return -Infinity;
  const minutes=(Date.parse(item.dueAt)-nowMs)/60_000;
  let score=-minutes;if(minutes<0)score+=2000+Math.abs(minutes)*3;
  if(item.priority==="urgent")score+=700;
  if(item.reason==="Call disconnected")score+=500;
  if(item.reason==="Technician missed appointment window")score+=420;
  if(item.reason==="Technician go-back request")score+=340;
  if(item.reason==="Make sure technician arrived")score+=260;
  return score+item.attemptCount*40;
}
export function transitionFollowUp(current:FollowUp,command:FollowUpCommand,now:Date):{next:FollowUp;event:FollowUpEvent}{
  const closed=["completed","abandoned","cancelled"].includes(current.status);
  if(closed&&command.type!=="restore")throw new Error("Follow-up is closed");
  if(!closed&&command.type==="restore")throw new Error("Follow-up is already active");
  const next={...current,revision:current.revision+1};
  let summary="";
  switch(command.type){
    case "busy":next.status="rescheduled";next.dueAt=addMinutes(now,10);summary="Busy · retry in 10 minutes";break;
    case "no_answer":
      if(current.attemptCount>=2)throw new Error("Voicemail confirmation required");
      next.attemptCount=current.attemptCount+1;
      if(next.attemptCount===1){next.status="no_answer_once";next.dueAt=addMinutes(now,15);summary="No answer · retry in 15 minutes";}
      else{next.status="voicemail_required";next.voicemailRequired=true;summary="No answer · confirm voicemail before closing";}
      break;
    case "confirm_voicemail":
      if(current.status!=="voicemail_required"||current.attemptCount<2||typeof command.voicemailLeft!=="boolean")throw new Error("Voicemail confirmation required");
      next.status="abandoned";next.voicemailLeft=command.voicemailLeft;next.completedAt=now.toISOString();summary=command.voicemailLeft?"Voicemail left · follow-up closed":"No voicemail left · follow-up closed";break;
    case "follow_up":case "escalation_required":case "reschedule":
      next.status=command.type==="escalation_required"?"escalated":"rescheduled";
      next.dueAt=command.dueAt??addMinutes(now,30);
      if(Date.parse(next.dueAt)<=now.getTime())throw new Error("Due time must be in the future");
      summary=command.type==="escalation_required"?"Escalation required · follow-up scheduled":"Follow-up rescheduled";break;
    case "resolved":case "wrong_number":case "cancel":
      next.status=command.type==="cancel"?"cancelled":"completed";next.completedAt=now.toISOString();summary=command.type==="resolved"?"Resolved":command.type==="wrong_number"?"Wrong number · closed":"Cancelled";break;
    case "restore":next.status="pending";next.completedAt=null;next.voicemailRequired=false;summary="Follow-up restored";break;
  }
  return {next,event:{type:command.type,at:now.toISOString(),summary,previous:current.status,next:next.status}};
}
