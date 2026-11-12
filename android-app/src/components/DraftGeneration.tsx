import { useAuthStore } from "@/store/auth.store";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { quoteDraft, submitDraft, draftStatus, type DraftRequest } from "@/lib/api/draft-generation";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Muted } from "@/components/ui/Screen";
export function DraftGeneration({caseId, contextId, request}: {caseId:string;contextId:string;request:Omit<DraftRequest,"requested_relief">}) {
 const scope = useAuthStore(s=>s.scopeGeneration);
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
return <View style={{gap:12,marginTop:16}}><Text style={{fontWeight:"700"}}>Generate unreviewed draft</Text><Text>Requested relief</Text>
 <TextInput accessibilityLabel="Requested relief" multiline maxLength={4000} value={relief} editable={!job && !submit.isPending} onChangeText={setRelief} style={{minHeight:100,borderWidth:1,borderColor:"#64748b",padding:12,borderRadius:8}} />
 {!job && <Button disabled={relief.trim().length<10 || estimate.isPending || submit.isPending || status.isPending || !!status.error} onPress={()=>estimate.mutate()}>Estimate generation cost</Button>}
 {quote && !job && <View><Text>Estimated reservation: ₹{(quote.estimated_reservation_paise/100).toFixed(2)} ({quote.model}). Provider billing may differ.</Text><Button disabled={submit.isPending || !!status.error} onPress={()=>submit.mutate()}>Generate draft — paid API call</Button></View>}
 {error && <Text accessibilityRole="alert">{error.message}</Text>}
 {job && <Text accessibilityLiveRegion="polite">Generation: {job.status}. {job.error_message} {job.status === "queued" ? "Waiting for worker and scheduler." : ""}</Text>}
 {job?.status === "failed" && <Muted>No automatic paid retry. Review the failure before creating a new context.</Muted>}
 {job?.status === "succeeded" && typeof documentId === "string" && <Button onPress={()=>router.push({pathname:"/cases/[caseId]/working-document-editor",params:{caseId,documentId}})}>Open draft for advocate review</Button>}
 <Muted>Source IDs are checked; factual and legal accuracy still require advocate review.</Muted></View>;
}
