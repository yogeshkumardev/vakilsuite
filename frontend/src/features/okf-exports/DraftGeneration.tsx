"use client";
import { useAuthStore } from "@/store/auth.store";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { quoteDraft, submitDraft, draftStatus, type DraftRequest } from "@/lib/api/draft-generation";
import Link from "next/link";
export function DraftGeneration({caseId, contextId, request}: {caseId:string;contextId:string;request:Omit<DraftRequest,"requested_relief">}) {
 const scope = useAuthStore(s=>s.generation);
 const [relief,setRelief] = useState("");
 const body = {...request,requested_relief:relief};
 const key = JSON.stringify(body);
 const status = useQuery({queryKey:["s528-generation",scope,caseId,contextId],queryFn:()=>draftStatus(caseId,contextId),refetchInterval:q=>q.state.data && ["succeeded","failed","cancelled"].includes(q.state.data.status) ? false : 3000});
 const estimate = useMutation({mutationFn:async()=>({key,quote:await quoteDraft(caseId,contextId,body)})});
 const quote = estimate.data?.key === key ? estimate.data.quote : undefined;
 const submit = useMutation({mutationFn:()=>submitDraft(caseId,contextId,body,quote!.quote_hash),onSuccess:()=>status.refetch()});
 const job = status.data ?? submit.data;
 const error = status.error ?? estimate.error ?? submit.error;
 const documentId = job?.result_summary?.working_document_id;
return <section className="space-y-3 border-t pt-4"><h3 className="font-semibold">Generate unreviewed draft</h3>
 <label className="block">Requested relief<textarea value={relief} maxLength={4000} disabled={!!job || submit.isPending} onChange={e=>setRelief(e.target.value)} className="block min-h-24 w-full rounded border p-3" /></label>
 {!job && <button disabled={relief.trim().length<10 || estimate.isPending || submit.isPending || status.isPending || !!status.error} onClick={()=>estimate.mutate()} className="min-h-11 rounded border px-4">Estimate generation cost</button>}
 {quote && !job && <div><p>Estimated reservation: ₹{(quote.estimated_reservation_paise/100).toFixed(2)} ({quote.model}). Provider billing may differ.</p><button disabled={submit.isPending || !!status.error} onClick={()=>submit.mutate()} className="min-h-11 rounded bg-indigo-600 px-4 text-white">{submit.isPending ? "Submitting…" : "Generate draft — paid API call"}</button></div>}
 {error && <p role="alert">{error.message}</p>}
 {job && <p role="status">Generation: {job.status}. {job.error_message} {job.status === "queued" ? "Waiting for worker and scheduler." : ""}</p>}
 {job?.status === "failed" && <p>No automatic paid retry. Review the failure before creating a new context.</p>}
 {job?.status === "succeeded" && typeof documentId === "string" && <Link className="inline-block min-h-11 underline" href={`/cases/${caseId}/working-documents/${documentId}`}>Open draft for advocate review</Link>}
 <p className="text-sm">Source IDs are checked; factual and legal accuracy still require advocate review.</p></section>;
}
