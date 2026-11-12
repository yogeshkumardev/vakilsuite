"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { clientsApi } from "@/lib/api/clients";

export default function NewMatterPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  return <WorkspacePage variant="form"><PageHeader title="New Matter" description="Start intake before a court number or party is known." />
    <Surface className="max-w-2xl p-6"><form className="space-y-5" onSubmit={async e=>{e.preventDefault();setSaving(true);setError(null);try{const matter=await clientsApi.createPreFilingMatter({matter_title:title,notes:notes||undefined});router.push(`/cases/${matter.id}`)}catch(err){setError(err instanceof Error?err.message:"Could not create matter")}finally{setSaving(false)}}}>
      <label className="block text-sm font-medium">Matter title<input required minLength={3} value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 w-full rounded border p-2" placeholder="e.g. Advice on property dispute" /></label>
      <label className="block text-sm font-medium">Initial notes <span className="font-normal text-slate-500">(optional)</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-2 min-h-28 w-full rounded border p-2" placeholder="What is known so far?" /></label>
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-3"><button type="button" className="rounded border px-4 py-2" onClick={()=>router.back()}>Cancel</button><button disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{saving?"Saving…":"Create Matter"}</button></div>
    </form></Surface></WorkspacePage>;
}
