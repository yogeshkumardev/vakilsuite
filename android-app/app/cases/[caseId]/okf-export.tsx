import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { components } from "@/types/generated-api";
import { Button, Card, Muted, Screen, Title } from "@/components/ui/Screen";
import { listAuthorityManifests, listOkfAnnexures, listOkfTemplates, prepareOkfExportPreview, saveOkfContext, getOkfContext, type OkfSelection, type OkfTemplate } from "@/lib/api/okf-exports";
import { getSummaryRun } from "@/lib/api/summaries";

import { DraftPreflight } from "@/components/DraftPreflight";
import { useAuthStore } from "@/store/auth.store";

type JsonRecord = Record<string, unknown>;
type FindingSelection = components["schemas"]["ConfirmedFindingSelection"];
const asRecord = (value: unknown): JsonRecord | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const asString = (value: unknown): string | null => typeof value === "string" ? value : null;
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export default function OkfExportScreen() {
  const { caseId, runId } = useLocalSearchParams<{ caseId: string; runId: string }>();
  const scope = useAuthStore(s => s.scopeGeneration);
  return <ScopedScreen key={`${scope}:${caseId}:${runId}`} caseId={caseId} runId={runId} scope={scope} />;
}

function ScopedScreen({caseId, runId, scope}: {caseId: string; runId: string; scope: number}) {
  const [showContents, setShowContents] = useState(false);
  const [template, setTemplate] = useState<OkfTemplate | null>(null);
  const [authorityId, setAuthorityId] = useState("");
  const [authorityOffset, setAuthorityOffset] = useState(0);
  const authorities = useQuery({queryKey: ["authority-manifests", caseId, scope, authorityOffset], queryFn: () => listAuthorityManifests(caseId, authorityOffset)});
  const selectedAuthority = authorities.data?.find(item => item.id === authorityId && !item.is_stale);

  const [facts, setFacts] = useState<Set<string>>(new Set());
  const [annexures, setAnnexures] = useState<Set<string>>(new Set());
  const run = useQuery({ queryKey: ["summary-run", caseId, runId, scope], queryFn: () => getSummaryRun(caseId, runId), enabled: Boolean(caseId && runId) });
  const templates = useQuery({ queryKey: ["okf-templates", caseId, scope], queryFn: () => listOkfTemplates(caseId), enabled: Boolean(caseId) });
  const annexureCandidates = useQuery({ queryKey: ["okf-annexures", caseId, scope], queryFn: () => listOkfAnnexures(caseId), enabled: Boolean(caseId) });
  const payload = asRecord(run.data?.result_payload);
  const legacyFindings = useMemo(() => asArray(payload?.sections).flatMap((sectionValue) => {
    const section = asRecord(sectionValue); const name = asString(section?.name);
    return asArray(section?.findings).map(asRecord).filter((item): item is JsonRecord => item !== null).map((finding, index) => ({ key: `${name}:${index}`, section: name as components["schemas"]["SummarySectionName"], finding_index: index, text: asString(finding.text) ?? "Not available" }));
  }).filter((item) => Boolean(item.section)), [payload]);
    const findings: (FindingSelection & {key:string;text:string})[] = run.data?.presentation
        ? run.data.presentation.selectable_facts.map(f=>({key:f.id,finding_id:f.id,text:`[${f.status}] ${f.text}`}))
        : legacyFindings;
  const selection = (): OkfSelection => {
    if (!run.data?.result_hash || !template) throw new Error("Choose a template and approved summary.");
    if (authorityId && !selectedAuthority) throw new Error("Reload and select a current authority manifest.");
    return { authority_manifest_id: selectedAuthority?.id, expected_authority_context_hash: selectedAuthority?.context_hash, summary_run_id: runId, expected_summary_result_hash: run.data.result_hash, bundle_id: template.bundle_id, bundle_version: template.bundle_version, template_entry_id: template.template_entry_id, confirmed_findings: findings.filter(item => facts.has(item.key)).map(({section, finding_index, finding_id}): FindingSelection => finding_id ? {finding_id} : ({section, finding_index})), annexure_ids: [...annexures].sort() };
  };
  const selectionKey = JSON.stringify({authorityId, authorityHash: selectedAuthority?.context_hash, template, facts: [...facts].sort(), annexures: [...annexures].sort(), hash: run.data?.result_hash});
  const preview = useMutation({mutationFn: async (input: {body: OkfSelection; key: string}) => ({...input, result: await prepareOkfExportPreview(caseId, input.body)})});
  const currentPreview = preview.data?.key === selectionKey ? preview.data.result : undefined;
  const save = useMutation({mutationFn: () => {
    if (!preview.data || preview.data.key !== selectionKey) throw new Error("Prepare a new preview for the current selection.");
    return saveOkfContext(caseId, {...preview.data.body, expected_manifest_sha256: preview.data.result.manifest_sha256});
  }});
  const read = useMutation({mutationFn: (id: string) => getOkfContext(caseId, id)});
  const toggle = (set: Set<string>, value: string, update: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    update(next);
  };
  const ready = (!authorityId || Boolean(selectedAuthority)) && run.data?.status === "completed" && Boolean(template) && facts.size > 0;
  return <Screen refreshing={run.isRefetching || templates.isRefetching} onRefresh={() => { void run.refetch(); void templates.refetch(); void annexureCandidates.refetch(); }}>
    <View style={{ gap: 6 }}><Title>Prepare OKF export</Title><Muted>Select reviewed facts for a deterministic preview. Review, save and verify the exact context before checking required facts.</Muted></View>
    {run.data?.status !== "completed" && <Text style={styles.warning}>A lawyer-approved summary is required.</Text>}
    {!templates.isLoading && templates.data?.length === 0 && <Card><Text style={styles.warning}>No production OKF template is configured</Text><Muted>Set OKF_BUNDLES_DIR to a verified non-synthetic approved bundle. The local S01 fixture is blocked from case export.</Muted></Card>}
    {templates.data?.map((item) => <Pressable key={`${item.bundle_id}:${item.bundle_version}:${item.template_entry_id}`} accessibilityRole="radio" accessibilityState={{ selected: template?.bundle_id === item.bundle_id && template?.bundle_version === item.bundle_version && template?.template_entry_id === item.template_entry_id }} onPress={() => setTemplate(item)} style={[styles.choice, template?.bundle_id === item.bundle_id && template?.bundle_version === item.bundle_version && template?.template_entry_id === item.template_entry_id && styles.selected]}><Text style={styles.choiceTitle}>{item.template_title}</Text><Muted>{item.bundle_id} v{item.bundle_version}</Muted></Pressable>)}
    <Card><Text style={styles.heading}>Confirm facts</Text><Muted>Only selected lawyer-reviewed facts enter this preview.</Muted>{findings.map((item) => <Pressable key={item.key} accessibilityRole="checkbox" accessibilityState={{ checked: facts.has(item.key) }} onPress={() => toggle(facts, item.key, setFacts)} style={[styles.choice, facts.has(item.key) && styles.selected]}><Text style={styles.choiceTitle}>{(item.section ?? "Structured finding").replaceAll("_", " ")}</Text><Text style={styles.fact}>{item.text}</Text></Pressable>)}</Card>
    <Card><Text style={styles.heading}>Map annexures (optional)</Text>{annexureCandidates.data?.map((item) => <Pressable key={item.annexure_id} disabled={!item.eligible} accessibilityRole="checkbox" accessibilityState={{ checked: annexures.has(item.annexure_id), disabled: !item.eligible }} onPress={() => toggle(annexures, item.annexure_id, setAnnexures)} style={[styles.choice, annexures.has(item.annexure_id) && styles.selected, !item.eligible && styles.disabled]}><Text style={styles.choiceTitle}>{item.slot_code} · {item.label}</Text><Muted>{item.eligible ? "Current verified file" : item.reason}</Muted></Pressable>)}</Card>
    <Card><Text style={styles.heading}>Legal authorities (optional)</Text><Muted>Select a reviewed manifest. Current reviews and passages are verified during preview/save.</Muted>
      <Pressable accessibilityRole="radio" accessibilityState={{selected: !authorityId}} onPress={() => setAuthorityId("")} style={styles.choice}><Text>No authorities attached{!authorityId ? " ✓" : ""}</Text></Pressable>
      {authorities.data?.map(item => <Pressable key={item.id} disabled={item.is_stale} accessibilityRole="radio" accessibilityState={{selected: authorityId === item.id, disabled: item.is_stale}} onPress={() => setAuthorityId(item.id)} style={[styles.choice, authorityId === item.id && styles.selected, item.is_stale && styles.disabled]}><Text>{item.id.slice(0, 8)} · {item.references.length} references{item.is_stale ? " · Stale" : ""}</Text><Muted>{item.context_hash}</Muted></Pressable>)}
      {authorities.isLoading && <Muted>Loading authority manifests…</Muted>}
      {authorities.data?.length === 0 && <Muted>No manifests on this page. Create a reviewed manifest through legal research first.</Muted>}
      {authorities.error && <Text accessibilityRole="alert" style={styles.error}>{authorities.error.message}</Text>}
      <Button variant="secondary" loading={authorities.isFetching} onPress={() => void authorities.refetch()}>Refresh authorities</Button>
      <Button variant="secondary" disabled={authorityOffset === 0 || authorities.isFetching} onPress={() => {setAuthorityId(""); setAuthorityOffset(n => Math.max(0, n - 50));}}>Newer</Button>
      <Button variant="secondary" disabled={authorities.data?.length !== 50 || authorities.isFetching} onPress={() => {setAuthorityId(""); setAuthorityOffset(n => n + 50);}}>Older</Button>
    </Card>
    <Button disabled={!ready || save.isPending} loading={preview.isPending} onPress={() => { save.reset(); read.reset(); preview.mutate({body: selection(), key: selectionKey}); }}>Prepare OKF export preview</Button>
    {preview.error && <Text accessibilityRole="alert" style={styles.error}>{preview.error.message}</Text>}
    {preview.data && !currentPreview && <Muted>Selection changed. Prepare a new preview before saving.</Muted>}
    {currentPreview && <Card><Text style={styles.success}>Preview prepared</Text><Text selectable style={styles.hash}>{currentPreview.manifest_sha256}</Text><Button variant="secondary" onPress={() => setShowContents(v => !v)}>{showContents ? "Hide preview contents" : "Review preview contents"}</Button>{showContents && <Text selectable style={styles.fact}>{JSON.stringify(currentPreview.payload, null, 2)}</Text>}<Muted>Save does not generate a draft or call AI.</Muted><Button loading={save.isPending} disabled={!ready || preview.isPending} onPress={() => { read.reset(); save.mutate(); }}>Save reviewed context</Button></Card>}
    {save.error && <Text accessibilityRole="alert" style={styles.error}>{save.error.message} Retry is safe for the same context.</Text>}
    {save.data && <Card><Text selectable>Saved context: {save.data.id}</Text><Button loading={read.isPending} disabled={save.isPending} onPress={() => read.mutate(save.data.id)}>Open and verify saved context</Button></Card>}
    {read.error && <Text accessibilityRole="alert" style={styles.error}>{read.error.message} Reload and prepare a new preview if sources changed.</Text>}
    {read.data && !read.error && !read.isPending && !save.isPending && <><Card><Text style={styles.success}>Saved context verified against current sources.</Text><Button variant="secondary" onPress={() => setShowContents(v => !v)}>{showContents ? "Hide saved contents" : "Review saved contents"}</Button>{showContents && <Text selectable style={styles.fact}>{JSON.stringify(read.data.payload, null, 2)}</Text>}</Card><DraftPreflight key={read.data.id} caseId={caseId} context={read.data} /></>}
    {[run.error, templates.error, annexureCandidates.error].filter(Boolean).map((error, i) => <Text key={i} accessibilityRole="alert" style={styles.error}>{error?.message}</Text>)}

  </Screen>;
}

const styles = StyleSheet.create({
  heading: { color: "#0f172a", fontSize: 17, fontWeight: "700" }, choice: { gap: 5, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginTop: 8 }, selected: { borderColor: "#126B5D", backgroundColor: "#edf9f6" }, disabled: { opacity: 0.6, backgroundColor: "#f8fafc" }, choiceTitle: { color: "#0f172a", fontSize: 14, fontWeight: "700" }, fact: { color: "#334155", fontSize: 14, lineHeight: 20 }, warning: { color: "#9a5a00", fontSize: 14, fontWeight: "700" }, error: { color: "#B42332", fontSize: 14 }, success: { color: "#087f5b", fontSize: 14, fontWeight: "700" }, hash: { color: "#64748b", fontSize: 11, lineHeight: 16 },
});
