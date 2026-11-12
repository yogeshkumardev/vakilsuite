import { DraftGeneration } from "./DraftGeneration";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import type { components } from "@/types/generated-api";
import { preflightOkfContext, type OkfContext } from "@/lib/api/okf-exports";
import { Button, Card, Muted } from "@/components/ui/Screen";

type Field = components["schemas"]["DraftField"];
const fields: Field[] = ["parties", "case_identification", "impugned_order", "procedural_history", "material_facts"];
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}
export function DraftPreflight({caseId, context}: {caseId: string; context: OkfContext}) {
  const [bindings, setBindings] = useState<Partial<Record<Field, string[]>>>({});
  const raw = record(record(context.payload).application).confirmed_facts;
  const facts = (Array.isArray(raw) ? raw : []).map(record).filter(f => typeof f.id === "string" && typeof f.text === "string");
  const key = JSON.stringify(bindings);
  const check = useMutation({mutationFn: async () => ({key, result: await preflightOkfContext(caseId, context.id, {expected_manifest_sha256: context.manifest_sha256, fact_bindings: bindings})})});
  const result = check.data?.key === key ? check.data.result : undefined;
  return <Card>
    <Text accessibilityRole="header" style={{fontSize: 18, fontWeight: "700"}}>Check required draft facts</Text>
    <Muted>Select supporting saved facts for each field. Leave missing information unselected. This checks coverage, not legal sufficiency.</Muted>
    {fields.map(field => <View key={field} style={{gap: 8, marginTop: 12}}>
      <Text style={{fontWeight: "700"}}>{field.replaceAll("_", " ")}</Text>
      {facts.map(f => {
        const selected = bindings[field]?.includes(String(f.id)) ?? false;
        return <Pressable key={String(f.id)} accessibilityRole="checkbox" accessibilityState={{checked: selected, disabled: check.isPending}} disabled={check.isPending} onPress={() => setBindings(old => ({...old, [field]: selected ? (old[field] ?? []).filter(id => id !== f.id) : [...(old[field] ?? []), String(f.id)]}))} style={{minHeight: 48, padding: 12, borderWidth: 1, borderColor: selected ? "#126B5D" : "#cbd5e1", borderRadius: 8, backgroundColor: selected ? "#edf9f6" : "white"}}><Text>{selected ? "✓ " : ""}{String(f.text)}</Text></Pressable>;
      })}
    </View>)}
    {!facts.length && <Muted>No confirmed facts are available in this saved context.</Muted>}
    <Button loading={check.isPending} onPress={() => check.mutate()}>Check missing facts</Button>
    {check.error && <Text accessibilityRole="alert" style={{color: "#B42332"}}>{check.error.message}</Text>}
    {result && !check.error && !check.isPending && <View accessibilityLiveRegion="polite"><Text>{result.missing_fields.length ? `Missing: ${result.missing_fields.map(f => f.replaceAll("_", " ")).join(", ")}` : "All required fields have selected references."}</Text>{result.warnings.map(w => <Muted key={w}>{w}</Muted>)}</View>}
    <DraftGeneration caseId={caseId} contextId={context.id} request={{expected_manifest_sha256:context.manifest_sha256,fact_bindings:bindings}} />
  </Card>;
}
