export type CaseStatus="Open"|"Follow-up scheduled"|"Handoff prepared"|"Closed";
export type CaseSource={type:"manual"}|{type:"follow-up";id:string;status:string}|{type:"rcc-handoff";id:string};
export type CaseRecord={id:string;humanId:string;ownerUserId:string;customerName:string;accountNumber:string;summary:string;category:string;priority:"High"|"Medium"|"Low";status:CaseStatus;sourceType:string;sourceId:string|null;revision:number;createdAt:string;updatedAt:string};
export type SaveCaseInput={customerName:string;accountNumber:string;summary:string;category:string;priority:"High"|"Medium"|"Low";source:CaseSource};
