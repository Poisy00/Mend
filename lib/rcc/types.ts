export type ExpediteInput={teamMode:"auto"|"long-island"|"nassau";account:string;phone:string;customerName:string;date:string;window:string;customWindow?:string;reason:string;summary:string;action:string;scheduled:boolean};
export type RccPreferences={longIslandEmail:string;nassauEmail:string;signature:string;name:string};
export type RouteDecision={id:"long-island"|"nassau";name:string;beforeCutoff:boolean;newYorkDate:string;warning:string};
export type Readiness={blockers:string[];suggestions:string[];ready:boolean};
export type EmailDraft={to:string;subject:string;plain:string;html:string};
export type RccWorkflow="expedite"|"technician-review"|"quick-follow-up";
