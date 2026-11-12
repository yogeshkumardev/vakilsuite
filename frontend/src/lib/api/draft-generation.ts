import type { components } from "@/types/generated-api";
import { apiClient } from "./client";
export type DraftRequest = components["schemas"]["DraftGenerationRequest"];
export type Quote = components["schemas"]["DraftQuoteResponse"];
export type DraftJob = components["schemas"]["JobOut"];
const path = (c: string, s: string) => `/cases/${c}/okf-contexts/${s}`;
export async function quoteDraft(c: string,s: string,b: DraftRequest) { return (await apiClient.post<{success:true;data:Quote}>(path(c,s)+"/draft-quote",b)).data; }
export async function submitDraft(c: string,s: string,b: DraftRequest,hash: string) { return (await apiClient.post<{success:true;data:DraftJob}>(path(c,s)+"/draft-generation",{...b,expected_quote_hash:hash})).data; }
export async function draftStatus(c: string,s: string) { return (await apiClient.get<{success:true;data:DraftJob|null}>(path(c,s)+"/draft-generation")).data; }
