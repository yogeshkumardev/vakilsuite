import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui/Screen";
import { listSummaryRuns, listSummarySourceCandidates, prepareSummaryRun, submitSummaryRun, type SummarySourceCandidate } from "@/lib/api/summaries";

import { useAuthStore } from "@/store/auth.store";

const reasonLabels: Record<string, string> = {
  eligible: "Approved and current",
  revision_not_found: "No usable revision exists",
  revision_hash_mismatch: "The revision changed",
  revision_not_approved: "Awaiting lawyer review",
  revision_is_not_current: "A newer revision exists",
  case_unavailable: "Case is unavailable",
  chamber_scope_mismatch: "Outside this chamber",
  source_not_found: "Original source is unavailable",
  source_hash_mismatch: "Original source changed",
  source_not_uploaded: "Original source is not uploaded",
  source_coverage_invalid: "Source page coverage is invalid",
};

function sourceReason(candidate: SummarySourceCandidate) {
  return candidate.reasons.map((reason) => reasonLabels[reason] ?? reason.replaceAll("_", " ")).join(" · ");
}

export default function CaseSummaryPreparationScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const scope=useAuthStore(s=>s.scopeGeneration);
  return <ScopedPreparation key={`${scope}:${caseId}`} caseId={caseId} scope={scope}/>;
}
function ScopedPreparation({caseId,scope}:{caseId:string;scope:number}) {
  const [language,setLanguage]=useState<"en-IN"|"hi-IN">("en-IN");
  const queryClient = useQueryClient();
  const [confirmedFingerprint, setConfirmedFingerprint] = useState("");
  const candidates = useQuery({ queryKey: ["summary-source-candidates", caseId, scope], queryFn: () => listSummarySourceCandidates(caseId), enabled: Boolean(caseId) });
  const runs = useQuery({ queryKey: ["summary-runs", caseId, scope], queryFn: () => listSummaryRuns(caseId), enabled: Boolean(caseId), refetchInterval: q=>q.state.data?.some(r=>r.status==="running")?3000:false });
  const sources = candidates.data ?? [];
  const fingerprint = JSON.stringify(sources.map(s => [s.working_document_id,s.revision_id,s.revision_sha256,s.eligible]));
  const ready = sources.length > 0 && sources.length <= 50 && sources.every(s => s.eligible && s.revision_id && s.revision_sha256 && s.original_document_id);
  const confirmed = ready && confirmedFingerprint === fingerprint;
  const prepare = useMutation({
    mutationFn: async () => {
      if (!confirmed || candidates.isFetching || candidates.error) throw new Error("Confirm current document readiness first.");
      const run = await prepareSummaryRun(caseId, (candidates.data ?? []).filter((source) => source.source_kind !== "original_pdf" && source.eligible && source.revision_id && source.revision_sha256).map((source) => ({ working_document_id: source.working_document_id, revision_id: source.revision_id!, expected_revision_sha256: source.revision_sha256! })), (candidates.data??[]).filter(s=>s.source_kind==="original_pdf"&&s.eligible).map(s=>({document_id:s.original_document_id!,file_version_id:s.revision_id!,sha256:s.revision_sha256!})),language);
      if(run.status === "pending") await submitSummaryRun(caseId,run.id);
      return run;
    },
    onSettled: async () => {

      await queryClient.invalidateQueries({ queryKey: ["summary-runs", caseId, scope] });
    },
  });
  const submit = useMutation({ mutationFn: (runId: string) => submitSummaryRun(caseId, runId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["summary-runs", caseId, scope] }); } });
  const eligibleCount = sources.filter(s=>s.eligible).length;

  return <Screen refreshing={candidates.isRefetching || runs.isRefetching} onRefresh={() => { void candidates.refetch(); void runs.refetch(); }}>
    <View style={{ gap: 6 }}><Title>Case Summary</Title><Muted>Upload all case documents and review scanned text. Generate one summary from the complete case; digital PDFs are read directly.</Muted></View>
    <View style={{flexDirection:"row",gap:8}}><Button variant={language==="en-IN"?"primary":"secondary"} onPress={()=>setLanguage("en-IN")}>English</Button><Button variant={language==="hi-IN"?"primary":"secondary"} onPress={()=>setLanguage("hi-IN")}>हिन्दी</Button></View>
    <Card><Text style={styles.infoTitle}>Case workflow</Text><Text style={styles.infoText}>Upload → review scanned text → generate and approve summary → generate and review draft → download. Generation uses your configured provider budget.</Text></Card>
    {candidates.error && <Text accessibilityRole="alert" style={styles.error}>{candidates.error.message}</Text>}
    {prepare.error && <Text accessibilityRole="alert" style={styles.error}>{prepare.error.message}</Text>}
    {submit.error && <Text accessibilityRole="alert" style={styles.error}>{submit.error.message}</Text>}
    {prepare.isSuccess && <Text accessibilityLiveRegion="polite" style={styles.success}>Summary request saved. Check its status below.</Text>}
    <View style={{ gap: 8 }}><Text style={styles.heading}>Document readiness</Text><Muted>{eligibleCount} eligible of {candidates.data?.length ?? 0} documents</Muted>
      {candidates.isLoading && <Muted>Checking current approval and coverage…</Muted>}
      {!candidates.isLoading && candidates.data?.length === 0 && <Card><Muted>Upload case documents first. Review every scan before summary generation.</Muted></Card>}
      {candidates.data?.map((candidate) => {
        return <Card key={candidate.working_document_id}><Text style={styles.sourceTitle}>{candidate.title}</Text><Text style={styles.sourceState}>{candidate.source_kind === "original_pdf" ? "Digital PDF · read directly" : sourceReason(candidate)}</Text><Text>{candidate.eligible ? "Ready" : "Action needed: prepare this document before generating the summary"}</Text></Card>;
      })}
    </View>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed,disabled:!ready}} disabled={!ready||prepare.isPending} onPress={()=>setConfirmedFingerprint(confirmed?"":fingerprint)} style={styles.source}><Text>{confirmed?"☑":"☐"} All required documents are uploaded and scanned text has been reviewed.</Text></Pressable>
    {!ready && <Muted>Finish all uploads and review scanned documents first. Use the web document workspace for OCR/text review.</Muted>}
    <Button disabled={!confirmed||candidates.isFetching||!!candidates.error} loading={prepare.isPending} onPress={()=>prepare.mutate()}>Generate Case Summary</Button>
    <View style={{ gap: 8 }}><Text style={styles.heading}>Summary state</Text><Muted>Pending is not a generated or approved summary.</Muted>
      {runs.isLoading && <Muted>Loading saved summary states…</Muted>}
      {!runs.isLoading && runs.data?.length === 0 && <Card><Muted>No summary source manifest has been prepared yet.</Muted></Card>}
      {runs.data?.map((run) => <Card key={run.id}><Text style={[styles.runStatus, { color: run.status === "stale" || run.status === "changes_requested" ? "#9a5a00" : run.status === "completed" ? "#087f5b" : "#1d4ed8" }]}>{run.status.replaceAll("_", " ")}</Text><Text style={styles.infoText}>{run.source_count} approved source{run.source_count === 1 ? "" : "s"} · policy v{run.policy_version}</Text><Text style={styles.meta}>Prepared {new Date(run.created_at).toLocaleString("en-IN")}</Text>{run.status === "pending" && <Button loading={submit.isPending} disabled={!confirmed} onPress={() => submit.mutate(run.id)}>Start summary generation</Button>}{run.status === "stale" && <Text style={styles.sourceState}>Re-select current sources before a future provider run.</Text>}{run.status === "running" && <Text style={styles.sourceState}>Generation queued or running.</Text>}{["pending_review", "completed", "changes_requested"].includes(run.status) && <Button variant="secondary" onPress={() => router.push({ pathname: "/cases/[caseId]/summary-review", params: { caseId, runId: run.id } })}>{run.status === "pending_review" ? "Review summary" : "View summary"}</Button>}</Card>)}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  infoTitle: { color: "#1d4ed8", fontSize: 14, fontWeight: "700" },
  infoText: { color: "#475569", fontSize: 14, lineHeight: 20 },
  error: { color: "#B42332", fontSize: 14, lineHeight: 20 },
  success: { color: "#087f5b", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  source: { minHeight: 64, flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, backgroundColor: "#fff", padding: 14 },
  sourceSelected: { borderColor: "#126B5D", backgroundColor: "#edf9f6" },
  sourceDisabled: { backgroundColor: "#f8fafc", opacity: 0.8 },
  checkbox: { width: 24, height: 24, marginTop: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#94a3b8", borderRadius: 5, backgroundColor: "#fff" },
  checkboxSelected: { borderColor: "#126B5D", backgroundColor: "#126B5D" },
  checkmark: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sourceContent: { flex: 1, minWidth: 0, gap: 3 },
  sourceTitle: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  sourceState: { fontSize: 13, lineHeight: 18 },
  meta: { color: "#64748b", fontSize: 12, lineHeight: 17 },
  runStatus: { fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
});
