export type AssistantStatus='draft'|'queued'|'running'|'completed'|'failed'|'cancelled'|'interrupted';
export interface AssistantInput{version:1;instructions:string;model:string;createdAt:string;localDate:string;timeZone:string;recordsRevision:number;profileRevision:number;jobId:string;question:string;context:{profile:unknown;job:unknown;board:unknown;history:{question:string;answer:string;jobId?:string;jobLabel?:string}[];omittedHistory:number;historyScope:string};}
export interface AssistantTurn{seq:number;id:string;jobId:string;jobLabel:string;question:string;status:AssistantStatus;output:string;error:string;cancelRequested:boolean;createdAt:string;updatedAt:string;model:string;recordsRevision:number;profileRevision:number;}
export interface AssistantPreview{turn:AssistantTurn;input:AssistantInput;characters:number;}
export interface AssistantPage{turns:AssistantTurn[];active:AssistantTurn|null;nextBefore?:number;}
export interface AssistantSaveSource{turnId:string;model:string;recordsRevision:number;profileRevision:number;question:string;}
export interface AssistantSavedAdvice extends AssistantSaveSource{key:string;hash:string;kind:'note'|'next';text:string;dueDate:string;at:string;todoId?:string;}
export interface AssistantSavePreview{key:string;turn:AssistantTurn;revision:number;job:{id:string;company:string;title:string;notes:string;next:string;stage:string};}
export interface AssistantSaveRequest{operation:'save-advice';id:string;key:string;revision:number;kind:'note'|'next';text:string;dueDate:string;}
export type AssistantRequest={operation:'list';before?:number}|{operation:'prepare';question:string;jobId:string}|{operation:'preview';id:string}|{operation:'start';id:string}|{operation:'cancel';id:string}|{operation:'advice-preview';id:string}|AssistantSaveRequest;
