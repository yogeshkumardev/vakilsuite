"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { clientsApi, type Client } from "@/lib/api/clients";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = async (search = query) => { try { setError(null); setClients(await clientsApi.list(search)); } catch (e) { setError(e instanceof Error ? e.message : "Could not load clients"); } };
  useEffect(() => { const timer = window.setTimeout(() => { void load(""); }, 0); return () => window.clearTimeout(timer); }, []);
  return <WorkspacePage variant="form"><PageHeader title="Clients" description="Contacts stay separate even when names match." />
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]"><Surface className="p-5"><label className="block text-sm font-medium">Search contacts<input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void load()} className="mt-2 w-full rounded border p-2" placeholder="Name, phone, email" /></label>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<ul className="mt-4 divide-y">{clients.map(c=><li key={c.id} className="py-3"><p className="font-medium">{c.full_name}</p><p className="text-sm text-slate-600">{c.phone || c.email || "No contact detail"}</p></li>)}{!clients.length&&!error&&<li className="py-6 text-sm text-slate-500">No matching clients.</li>}</ul></Surface>
      <Surface className="p-5"><h2 className="font-semibold">Add client</h2><form className="mt-3 space-y-3" onSubmit={async e=>{e.preventDefault();try{await clientsApi.create({full_name:name});setName("");await load();}catch(err){setError(err instanceof Error?err.message:"Could not create client")}}}><input required value={name} onChange={e=>setName(e.target.value)} className="w-full rounded border p-2" placeholder="Full name"/><button className="rounded bg-indigo-600 px-3 py-2 text-white">Save client</button></form></Surface></div></WorkspacePage>;
}
