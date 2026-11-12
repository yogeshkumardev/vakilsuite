"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useCase, useUpdateCase } from "@/features/cases/hooks/useCases";
import { useCasePermissions } from "@/features/cases/hooks/useCasePermissions";
import { Button } from "@/components/shared/Button";
import { CONTROL_CLASS } from "@/components/ui/Field";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { CASE_TYPE_LABELS, type CaseDetail, type CaseType } from "@/types/api";

function EditForm({ item }: { item: CaseDetail }) {
    const router = useRouter();
    const update = useUpdateCase(item.id);
    const [title, setTitle] = useState(item.case_title);
    const [type, setType] = useState(item.case_type);
    const [petitioner, setPetitioner] = useState(item.petitioner_name);
    const [respondent, setRespondent] = useState(item.respondent_name);
    const [facts, setFacts] = useState(item.brief_facts ?? "");
    return <form className="space-y-4" onSubmit={async e => {
        e.preventDefault();
        if (update.isPending) return;
        try { await update.mutateAsync({ case_title: title.trim(), case_type: type, petitioner_name: petitioner.trim(), respondent_name: respondent.trim(), brief_facts: facts }); router.push(`/cases/${item.id}`); } catch { /* Mutation error displayed below. */ }
    }}>
        <fieldset disabled={update.isPending} className="space-y-4">
            <label className="block text-sm">Case title<input required minLength={3} maxLength={500} className={CONTROL_CLASS} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label className="block text-sm">Case type<select className={CONTROL_CLASS} value={type} onChange={e => setType(e.target.value as CaseType)}>{Object.entries(CASE_TYPE_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
            <label className="block text-sm">Petitioner<input required maxLength={500} className={CONTROL_CLASS} value={petitioner} onChange={e => setPetitioner(e.target.value)} /></label>
            <label className="block text-sm">Respondent<input required maxLength={500} className={CONTROL_CLASS} value={respondent} onChange={e => setRespondent(e.target.value)} /></label>
            <label className="block text-sm">Brief facts<textarea rows={6} className={CONTROL_CLASS} value={facts} onChange={e => setFacts(e.target.value)} /></label>
        </fieldset>
        {update.error && <p role="alert" className="text-sm text-red-700">{update.error.message}</p>}
        <div className="flex gap-4 items-center"><Button type="submit" loading={update.isPending}>Save changes</Button><Link href={`/cases/${item.id}`}>Cancel</Link></div>
    </form>;
}

export default function EditCasePage() {
    const { id } = useParams<{ id: string }>();
    const query = useCase(id);
    const permissions = useCasePermissions(id);
    return <WorkspacePage variant="form"><h1 className="mb-5 text-xl font-semibold">Edit case</h1>
        {query.error || permissions.error ? <p role="alert">Unable to load case or permissions. <Link href="/cases">Back to cases</Link></p> : !query.data || permissions.isPending ? <p>Loading…</p> : !permissions.data?.can_edit ? <p>This case is read-only.</p> : <EditForm item={query.data} />}
    </WorkspacePage>;
}
