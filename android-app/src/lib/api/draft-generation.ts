import type { components } from "@/types/generated-api";
import { apiClient } from "./client";
export type DraftRequest = components["schemas"]["DraftGenerationRequest"];
export type Quote = components["schemas"]["DraftQuoteResponse"];
export type DraftJob = components["schemas"]["JobOut"];
const path = (c: string, s: string) => `/cases/${c}/okf-contexts/${s}`;
export function quoteDraft(c: string,s: string,b: DraftRequest): Promise<Quote> { return apiClient.post(path(c,s)+"/draft-quote",b); }
export function submitDraft(c: string,s: string,b: DraftRequest,hash: string): Promise<DraftJob> { return apiClient.post(path(c,s)+"/draft-generation",{...b,expected_quote_hash:hash}); }
export function draftStatus(c: string,s: string): Promise<DraftJob|null> { return apiClient.get(path(c,s)+"/draft-generation"); }
