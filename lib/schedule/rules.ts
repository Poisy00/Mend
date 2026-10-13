export type Pause={start:string;end:string};
export type DayPlan={off:boolean;start:string;end:string;breaks:Pause[];lunch:Pause|null};
export type WeekPattern=[DayPlan,DayPlan,DayPlan,DayPlan,DayPlan,DayPlan,DayPlan];
export type DayException={date:string;plan:DayPlan};
export type ValidationResult={valid:boolean;errors:string[]};
const minutes=(value:string)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return NaN;const [h,m]=value.split(":").map(Number);return h*60+m;};
const empty:DayPlan={off:true,start:"09:00",end:"17:00",breaks:[],lunch:null};
export const emptyWeek=():WeekPattern=>Array.from({length:7},()=>({...empty,breaks:[]})) as unknown as WeekPattern;
export function applyDayToWeek(day:DayPlan):WeekPattern{return Array.from({length:7},()=>({...day,breaks:day.breaks.map(pause=>({...pause})),lunch:day.lunch?{...day.lunch}:null})) as WeekPattern;}
export function validateWeeklyPattern(week:WeekPattern):ValidationResult{const errors:string[]=[];if(!Array.isArray(week)||week.length!==7)return {valid:false,errors:["A full Sunday–Saturday week is required"]};for(let i=0;i<7;i++){const day=week[i];if(!day){errors.push(`Day ${i+1} is missing`);continue;}if(day.off){if(day.breaks.length||day.lunch)errors.push(`Off day ${i+1} cannot have pauses`);continue;}const start=minutes(day.start),end=minutes(day.end);if(!Number.isFinite(start)||!Number.isFinite(end)||start===end){errors.push(`Day ${i+1} needs a valid shift`);continue;}const duration=(end-start+1440)%1440;const within=(pause:Pause,length:number)=>{const a=minutes(pause.start),b=minutes(pause.end);return Number.isFinite(a)&&Number.isFinite(b)&&((b-a+1440)%1440)===length&&((a-start+1440)%1440)<duration&&((b-start+1440)%1440)<=duration&&((a-start+1440)%1440)<((b-start+1440)%1440);};for(const pause of day.breaks)if(!within(pause,15))errors.push(`Day ${i+1} breaks must be 15 minutes within shift`);if(day.lunch&&!within(day.lunch,30))errors.push(`Day ${i+1} lunch must be 30 minutes within shift`);}return {valid:errors.length===0,errors};}
export function effectiveDay(pattern:WeekPattern,exception:DayException|null,cairoDate:string):DayPlan{return exception?.date===cairoDate?exception.plan:pattern[new Date(`${cairoDate}T12:00:00Z`).getUTCDay()];}
function cairoParts(date:Date){const entries=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);return Object.fromEntries(entries.map(item=>[item.type,item.value]));}
export function activeShift(pattern:WeekPattern,exceptions:DayException[],instant:Date):{working:boolean;onPause:boolean;day:DayPlan;cairoDate:string}{const p=cairoParts(instant);const date=`${p.year}-${p.month}-${p.day}`, now=Number(p.hour)*60+Number(p.minute);const day=effectiveDay(pattern,exceptions.find(item=>item.date===date)??null,date);const active=(plan:DayPlan,afterMidnight:boolean)=>{if(plan.off)return false;const start=minutes(plan.start),end=minutes(plan.end);return end>start?!afterMidnight&&now>=start&&now<end:afterMidnight?now<end:now>=start;};let activeDay=day;if(!active(day,false)){const previousDate=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)-1)).toISOString().slice(0,10);const previous=effectiveDay(pattern,exceptions.find(item=>item.date===previousDate)??null,previousDate);if(active(previous,true))activeDay=previous;else return {working:false,onPause:false,day,cairoDate:date};}const pauses=[...activeDay.breaks,...(activeDay.lunch?[activeDay.lunch]:[])];const onPause=pauses.some(pause=>{const start=minutes(pause.start),end=minutes(pause.end);return end>start?now>=start&&now<end:now>=start||now<end;});return {working:true,onPause,day:activeDay,cairoDate:date};}
const clock12=(value:string)=>{const [h,m]=value.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`;};
export type ShiftSummary={state:"on"|"break"|"off";headline:string;detail:string;line:string;day:DayPlan;nowMinute:number};
export function shiftSummary(pattern:WeekPattern,exceptions:DayException[],instant:Date):ShiftSummary{
  const p=cairoParts(instant),nowMinute=Number(p.hour)*60+Number(p.minute);
  const shift=activeShift(pattern,exceptions,instant);
  if(shift.working){
    const day=shift.day;
    if(shift.onPause){
      const pause=[...day.breaks,...(day.lunch?[day.lunch]:[])].find(item=>{const a=minutes(item.start),b=minutes(item.end);return b>a?nowMinute>=a&&nowMinute<b:nowMinute>=a||nowMinute<b;});
      const back=pause?clock12(pause.end):clock12(day.end);
      return {state:"break",headline:"On a break",detail:`Back at ${back}`,line:`On a break · back ${back}`,day,nowMinute};
    }
    const left=(minutes(day.end)-nowMinute+1440)%1440,until=clock12(day.end);
    return {state:"on",headline:"On shift",detail:`Until ${until} · ${Math.floor(left/60)}h ${left%60}m left`,line:`On shift · until ${until}`,day,nowMinute};
  }
  let next="";
  for(let offset=0;offset<=7&&!next;offset++){
    const date=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+offset)).toISOString().slice(0,10);
    const plan=effectiveDay(pattern,exceptions.find(item=>item.date===date)??null,date);
    if(plan.off||(offset===0&&minutes(plan.start)<=nowMinute))continue;
    const weekday=offset===0?"today":offset===1?"tomorrow":new Intl.DateTimeFormat("en-US",{timeZone:"UTC",weekday:"short"}).format(Date.parse(`${date}T12:00:00Z`));
    next=`${weekday} ${clock12(plan.start)}`;
  }
  return {state:"off",headline:"Off shift",detail:next?`Next shift ${next}`:"No upcoming shifts",line:next?`Off shift · next ${next}`:"Off shift",day:shift.day,nowMinute};
}
