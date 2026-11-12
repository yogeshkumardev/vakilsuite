import { apiClient } from "./client";
import type { components } from "@/types/generated-api";
export type OriginalSource = components["schemas"]["OriginalSourceResponse"];
export type SourceOcrStatus = components["schemas"]["SourceOcrStatusResponse"];
export type SourcePage = components["schemas"]["SourcePage"];
type Envelope<T> = {success:true;data:T};
const path=(id:string)=>`/documents/${id}/summary-source`;
export async function inspectOriginal(id:string) {return (await apiClient.post<Envelope<OriginalSource>>(path(id),{}, {timeoutMs:60000})).data;}
export async function getSourceOcrStatus(id:string) {return (await apiClient.get<Envelope<SourceOcrStatus>>(path(id)+"/ocr-status")).data;}
export async function reviewOriginal(id:string,body:components["schemas"]["ReviewOriginalRequest"]) {return (await apiClient.post<Envelope<OriginalSource>>(path(id)+"/review",body)).data;}
export async function quotePage(id:string,body:components["schemas"]["OcrPageRequest"]) {return (await apiClient.post<Envelope<components["schemas"]["OcrQuote"]>>(path(id)+"/ocr-quote",body,{timeoutMs:90000})).data;}
export async function transcribePage(id:string,body:components["schemas"]["OcrSubmitRequest"]) {return (await apiClient.post<Envelope<components["schemas"]["JobOut"]>>(path(id)+"/ocr",body,{timeoutMs:90000})).data;}
export async function saveSourceEditor(id:string,body:components["schemas"]["SaveSourceEditorRequest"]) {return (await apiClient.post<Envelope<OriginalSource>>(path(id)+"/editor",body,{timeoutMs:60000})).data;}
export async function reviewSourceEditor(id:string,body:components["schemas"]["ReviewSourceEditorRequest"]) {return (await apiClient.post<Envelope<OriginalSource>>(path(id)+"/editor-review",body,{timeoutMs:60000})).data;}
export async function repairSourceEditor(id:string,body:components["schemas"]["ReviewSourceEditorRequest"]) {return (await apiClient.post<Envelope<OriginalSource>>(path(id)+"/editor-repair",body,{timeoutMs:60000})).data;}
