import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, TextInput, View, Text } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui/Screen";
import { createLegalResearchRun, getLegalResearchConfig, listLegalResearchRuns, submitLegalResearchRun } from "@/lib/api/legal-research";

export default function LegalResearchScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>(); const [query, setQuery] = useState("");
  const config = useQuery({ queryKey: ["legal-research-config", caseId], queryFn: () => getLegalResearchConfig(caseId), enabled: Boolean(caseId) });
  const runs = useQuery({ queryKey: ["legal-research-runs", caseId], queryFn: () => listLegalResearchRuns(caseId), enabled: Boolean(config.data?.available) });
  const create = useMutation({ mutationFn: () => createLegalResearchRun(caseId, { query, idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, budget_paise: 50 }), onSuccess: () => void runs.refetch() });
  const submit = useMutation({ mutationFn: (runId: string) => submitLegalResearchRun(caseId, runId), onSuccess: () => void runs.refetch() });
  return <Screen><Title>Legal research</Title><Muted>Public legal issue search only. Every result needs advocate review before it can support a draft.</Muted>{config.isLoading ? <Muted>Checking availability…</Muted> : null}{config.data && !config.data.available ? <Card><Text style={{ fontWeight: "700" }}>Legal research is unavailable</Text><Muted>{config.data.reason}</Muted></Card> : null}{config.data?.available ? <><Card><TextInput accessibilityLabel="Research issue" value={query} onChangeText={setQuery} placeholder="Section 482 CrPC quashing" style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12 }} /><Muted>Estimated first search: ₹0.50</Muted><Button disabled={query.trim().length < 3} loading={create.isPending} onPress={() => create.mutate()}>Create research run</Button>{create.error ? <Text accessibilityRole="alert" style={{ color: "#B42332" }}>{create.error.message}</Text> : null}</Card><View style={{ gap: 8 }}><Text style={{ fontWeight: "700" }}>Research runs</Text>{runs.data?.map((run) => <Card key={run.id}><Text style={{ fontWeight: "700" }}>{run.query}</Text><Muted>{run.status} · budget ₹{(run.budget_paise / 100).toFixed(2)}</Muted>{run.status === "pending" ? <Button loading={submit.isPending} onPress={() => Alert.alert("Submit search?", "Estimated cost: ₹0.50. This sends one request to Indian Kanoon.", [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => submit.mutate(run.id) }])}>Submit search (₹0.50)</Button> : null}{(run.results ?? []).map((hit) => <Text key={String(hit.upstream_document_id)}>{String(hit.title ?? "Judgment")}</Text>)}</Card>)}</View></> : null}</Screen>;
}
