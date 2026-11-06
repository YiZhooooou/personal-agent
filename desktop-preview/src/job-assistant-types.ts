export type AssistantStatus='draft'|'queued'|'running'|'completed'|'failed'|'cancelled'|'interrupted';
export interface AssistantInput{version:1;instructions:string;model:string;createdAt:string;localDate:string;timeZone:string;recordsRevision:number;profileRevision:number;jobId:string;question:string;context:{profile:unknown;job:unknown;board:unknown;history:{question:string;answer:string;jobId?:string;jobLabel?:string}[];omittedHistory:number;historyScope:string};}
export interface AssistantTurn{seq:number;id:string;jobId:string;jobLabel:string;question:string;status:AssistantStatus;output:string;error:string;cancelRequested:boolean;createdAt:string;updatedAt:string;model:string;recordsRevision:number;profileRevision:number;}
export interface AssistantPreview{turn:AssistantTurn;input:AssistantInput;characters:number;}
export interface AssistantPage{turns:AssistantTurn[];active:AssistantTurn|null;nextBefore?:number;}
export type AssistantRequest={operation:'list';before?:number}|{operation:'prepare';question:string;jobId:string}|{operation:'preview';id:string}|{operation:'start';id:string}|{operation:'cancel';id:string};
