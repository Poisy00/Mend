export type SourceZone="Africa/Cairo"|"America/New_York";
function parts(date:Date,zone:SourceZone){
  const values=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
  return Object.fromEntries(values.map(part=>[part.type,part.value]));
}
export function wallTimeToUtc(local:string,zone:SourceZone,disambiguation?:"earlier"|"later"):string {
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if(!match)throw new Error("Use YYYY-MM-DDTHH:mm");
  const [,year,month,day,hour,minute]=match;
  const base=Date.UTC(Number(year),Number(month)-1,Number(day),Number(hour),Number(minute));
  if(new Date(base).toISOString().slice(0,16)!==local)throw new Error("Invalid wall time");
  const candidates:string[]=[];
  for(let offset=-12*60;offset<=14*60;offset+=15){
    const date=new Date(base-offset*60_000), p=parts(date,zone);
    if(p.year===year&&p.month===month&&p.day===day&&p.hour===hour&&p.minute===minute)candidates.push(date.toISOString());
  }
  const unique=[...new Set(candidates)].sort();
  if(unique.length===0)throw new Error("This local time does not exist in the selected time zone");
  if(unique.length>1&&!disambiguation)throw new Error("This local time occurs twice; choose earlier or later");
  return disambiguation==="later"?unique.at(-1)!:unique[0];
}
