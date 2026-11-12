"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { feesApi } from "@/lib/api/clients";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";

const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

export default function MatterFeesPage() {
  const { id } = useParams<{ id: string }>();
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof feesApi.ledger>> | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try { setLedger(await feesApi.ledger(id)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "No fee agreement yet"); }
  };
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [id]);
  const paise = Math.round(Number(amount) * 100);
  return <WorkspacePage variant="form"><PageHeader title="Fee ledger" description="Immutable manual postings in INR." />
    <Surface className="p-5">
      {ledger ? <>
        <div className="grid gap-3 sm:grid-cols-3"><p>Agreed <b>{rupees(ledger.agreement.agreed_amount_paise)}</b></p><p>Collected <b>{rupees(ledger.collected_paise)}</b></p><p>Outstanding <b>{rupees(ledger.outstanding_paise)}</b></p></div>
        <button className="mt-4 rounded border px-3 py-2 text-sm print:hidden" onClick={() => window.print()}>Print ledger</button>
        <form className="mt-5 flex gap-2" onSubmit={async (e) => { e.preventDefault(); await feesApi.post(id, ledger.agreement.id, "payment", paise); setAmount(""); await load(); }}>
          <input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded border p-2" placeholder="Payment ₹" />
          <button className="rounded bg-indigo-600 px-3 text-white">Post payment</button>
        </form>
        <ul className="mt-5 divide-y">{ledger.entries.map((entry) => <li className="flex justify-between py-2" key={entry.id}><span>{entry.entry_type}</span><span>{rupees(entry.amount_paise)}</span></li>)}</ul>
      </> : <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await feesApi.agreement(id, paise); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Could not save agreement"); } }}>
        <input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded border p-2" placeholder="Agreed fee ₹" />
        <button className="rounded bg-indigo-600 px-3 text-white">Create agreement</button>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </Surface>
  </WorkspacePage>;
}
