"use client";
import { DraftGeneration } from "./DraftGeneration";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/types/generated-api";
import { okfExportsApi, type OkfContext } from "@/lib/api/okf-exports";
import { Surface } from "@/components/ui/Surface";
import { Alert } from "@/components/ui/Alert";

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
    const check = useMutation({mutationFn: async () => ({key, result: await okfExportsApi.preflight(caseId, context.id, {expected_manifest_sha256: context.manifest_sha256, fact_bindings: bindings})})});
    const result = check.data?.key === key ? check.data.result : undefined;
    return <Surface as="section" variant="bordered" className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">Check required draft facts</h2>
        <p className="text-sm">Select supporting saved facts for each field. Leave missing information unselected. This checks coverage; it does not generate a draft or approve legal sufficiency.</p>
        {fields.map(field => <fieldset key={field} disabled={check.isPending} className="space-y-2"><legend className="font-medium capitalize">{field.replaceAll("_", " ")}</legend>
            {facts.map(f => <label key={String(f.id)} className="flex min-h-11 items-start gap-3 rounded border p-3 text-sm"><input type="checkbox" checked={bindings[field]?.includes(String(f.id)) ?? false} onChange={event => setBindings(old => ({...old, [field]: event.target.checked ? [...(old[field] ?? []), String(f.id)] : (old[field] ?? []).filter(id => id !== f.id)}))} /><span>{String(f.text)}</span></label>)}
        </fieldset>)}
        {!facts.length && <p>No confirmed facts are available in this saved context.</p>}
        <button type="button" disabled={check.isPending} onClick={() => check.mutate()} className="min-h-11 rounded bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50">{check.isPending ? "Checking…" : "Check missing facts"}</button>
        {check.error && <Alert tone="danger" title="Unable to check this context">{check.error.message}</Alert>}
        {result && !check.error && !check.isPending && <div role="status"><p>{result.missing_fields.length ? `Missing: ${result.missing_fields.map(f => f.replaceAll("_", " ")).join(", ")}` : "All required fields have selected references."}</p>{result.warnings.map(w => <p key={w} className="mt-2 text-sm">{w}</p>)}</div>}
    <DraftGeneration caseId={caseId} contextId={context.id} request={{expected_manifest_sha256:context.manifest_sha256,fact_bindings:bindings}} />
    </Surface>;
}
