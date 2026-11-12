import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { decideSummaryReview, getSummaryRun } from "@/lib/api/summaries";

import { StructuredSummaryView } from "@/components/summaries/StructuredSummaryView";
import { useAuthStore } from "@/store/auth.store";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export default function SummaryReviewScreen() {
  const { caseId, runId } = useLocalSearchParams<{ caseId: string; runId: string }>();
  const scope=useAuthStore(s=>s.scopeGeneration);
  return <ScopedSummaryReview key={`${scope}:${caseId}:${runId}`} caseId={caseId} runId={runId} scope={scope}/>;
}

function ScopedSummaryReview({caseId,runId,scope}:{caseId:string;runId:string;scope:number}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const run = useQuery({ queryKey: ["summary-run", caseId, runId, scope], queryFn: () => getSummaryRun(caseId, runId), enabled: Boolean(caseId && runId) });
  const decide = useMutation({
    mutationFn: (action: "approve" | "request_changes") => {
      if (!run.data?.result_hash) throw new Error("This summary has no reviewable generated result.");
      return decideSummaryReview(caseId, runId, {
        action,
        expected_result_hash: run.data.result_hash,
        expected_review_version: run.data.review_version,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
    },
    onSuccess: async () => {
      setComment("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["summary-run", caseId, runId, scope] }),
        queryClient.invalidateQueries({ queryKey: ["summary-runs", caseId] }),
      ]);
    },
  });
  const payload = asRecord(run.data?.result_payload);
  const sections = asArray(payload?.sections).map(asRecord).filter((item): item is JsonRecord => item !== null);
  const validation = asRecord(run.data?.validation_report);
  const issues = asArray(validation?.issues).map(asRecord).filter((item): item is JsonRecord => item !== null);
  const canReview = run.data?.status === "pending_review" && Boolean(run.data.result_hash);

  return <Screen refreshing={run.isRefetching} onRefresh={() => { void run.refetch(); }}>
    <View style={{ gap: 6 }}><Title>Review Case Summary</Title><Muted>This is derived AI output, not an approved pleading or established fact. Check every cited finding against its source.</Muted></View>
    {run.isLoading && <Muted>Loading generated summary…</Muted>}
    {run.error && <Text accessibilityRole="alert" style={styles.error}>{run.error.message}</Text>}
    {run.data?.status === "stale" && <Card><Text style={styles.warning}>Source authority changed</Text><Muted>This result cannot be approved. Prepare current approved sources again.</Muted></Card>}
    {run.data?.status === "changes_requested" && <Card><Text style={styles.warning}>Changes requested</Text><Muted>The original provider output is preserved for audit. Prepare a new manifest and generate a new summary after resolving the note.</Muted></Card>}
    {run.data?.status === "completed" && <Card><Text style={styles.success}>Summary approved</Text><Muted>The decision applies only to this exact result and source manifest.</Muted><Button variant="secondary" onPress={() => router.push({ pathname: "/cases/[caseId]/okf-export", params: { caseId, runId } })}>Generate draft from approved summary</Button></Card>}
    {run.data && <><Card><Text style={styles.meta}>{run.data.source_count} approved source{run.data.source_count === 1 ? "" : "s"}</Text><Text style={styles.meta}>{run.data.provider ? `${run.data.provider} · ${run.data.model ?? "model not available"}` : "Provider not available"}</Text><Text style={styles.hash}>Result hash: {run.data.result_hash ?? "Not available"}</Text></Card>
    {validation && <Card><Text style={issues.length ? styles.warning : styles.success}>{issues.length ? "Validation warnings need advocate review" : "No deterministic validation warnings"}</Text><Muted>{String(validation.needs_advocate_review ?? 0)} finding(s) need advocate review. This safety check is not a legal finding.</Muted>{issues.slice(0, 20).map((issue, index) => <Text key={index} style={styles.issue}>• {asString(issue.reason) ?? "Review this finding against the cited source."}</Text>)}</Card>}
    {canReview && <Card><Text style={styles.heading}>Lawyer decision</Text><Muted>Approval makes this exact result a reviewed summary. Requesting changes keeps the source output unchanged for audit.</Muted><Field label="Review note (required to request changes)" multiline value={comment} onChangeText={setComment} maxLength={2000} placeholder="Describe unsupported statements, corrections, or required changes." style={[styles.input, styles.textarea]} editable={!decide.isPending} /><Button loading={decide.isPending} onPress={() => decide.mutate("approve")}>Approve summary</Button><Button variant="secondary" disabled={decide.isPending || !comment.trim()} onPress={() => decide.mutate("request_changes")}>Request changes</Button>{decide.error && <Text accessibilityRole="alert" style={styles.error}>{decide.error.message}</Text>}</Card>}
    {run.data.presentation ? <StructuredSummaryView view={run.data.presentation} caseId={caseId} runId={runId}/> : <View style={{ gap: 8 }}><Text style={styles.heading}>Legacy summary content</Text><Muted>“Not available” means verified information was not provided to the model.</Muted>{sections.length === 0 && <Card><Muted>No generated summary content is available yet.</Muted></Card>}{sections.map((section, sectionIndex) => <Card key={`${asString(section.name) ?? "section"}-${sectionIndex}`}><Text style={styles.sectionTitle}>{(asString(section.name) ?? "Not available").replaceAll("_", " ")}</Text>{asArray(section.findings).map(asRecord).filter((item): item is JsonRecord => item !== null).map((finding, index) => <View key={index} style={styles.finding}><Text style={styles.findingText}>{asString(finding.text) ?? "Not available"}</Text>{asArray(finding.citations).map(asRecord).filter((item): item is JsonRecord => item !== null).map((citation, citationIndex) => <Text key={citationIndex} style={styles.citation}>Source {asString(citation.source_document_id)?.slice(0, 8) ?? "not available"} · {asString(citation.page_reference_note) ?? "Page not available"}</Text>)}</View>)}</Card>)}</View>}
    {run.data.decisions.length > 0 && <Card><Text style={styles.heading}>Decision audit</Text>{run.data.decisions.map((decision) => <View key={decision.id} style={styles.audit}><Text style={styles.findingText}>{decision.action.replaceAll("_", " ")} · {new Date(decision.created_at).toLocaleString("en-IN")}</Text>{decision.comment && <Muted>{decision.comment}</Muted>}</View>)}</Card>}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  error: { color: "#B42332", fontSize: 14, lineHeight: 20 },
  warning: { color: "#9a5a00", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  success: { color: "#087f5b", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  meta: { color: "#475569", fontSize: 13, lineHeight: 19 },
  hash: { color: "#64748b", fontSize: 11, lineHeight: 16 },
  issue: { color: "#7c4a03", fontSize: 13, lineHeight: 19 },
  input: { minHeight: 46 },
  textarea: { minHeight: 110, textAlignVertical: "top", paddingTop: 12 },
  finding: { gap: 6, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 },
  findingText: { color: "#1e293b", fontSize: 14, lineHeight: 21 },
  citation: { color: "#475569", fontSize: 12, lineHeight: 18 },
  audit: { gap: 4, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 },
});
