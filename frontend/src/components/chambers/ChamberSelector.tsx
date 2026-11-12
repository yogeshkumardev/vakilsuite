"use client";

import { chambersApi, type Chamber } from "@/lib/api/chambers";
import { useChamberStore } from "@/store/chamber.store";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useEffect } from "react";

export function ChamberSelector() {
  const selected = useChamberStore((state) => state.selected);
  const setSelected = useChamberStore((state) => state.setSelected);
  const chambers = useQuery({ queryKey: ["chambers"], queryFn: chambersApi.list });
  useEffect(() => {
    const current = chambers.data?.find((item: Chamber) => item.id === selected?.id);
    const fallback = current ?? chambers.data?.[0];
    if (fallback && fallback.id !== selected?.id) setSelected({ id: fallback.id, name: fallback.name, role: fallback.membership.role });
  }, [chambers.data, selected?.id, setSelected]);
  if (chambers.isLoading) return <div className="mx-3 mb-3 h-10 animate-pulse rounded-md bg-slate-100" aria-label="Loading chambers" />;
  if (chambers.isError || !chambers.data?.length) return null;
  return <label className="mb-3 block px-3 text-xs font-medium text-slate-600"><span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><Building2 className="h-3 w-3" /> Active chamber</span><select aria-label="Active chamber" value={selected?.id ?? ""} onChange={(event) => { const chamber = chambers.data?.find((item: Chamber) => item.id === event.target.value); if (chamber) setSelected({ id: chamber.id, name: chamber.name, role: chamber.membership.role }); }} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{chambers.data.map((chamber: Chamber) => <option key={chamber.id} value={chamber.id}>{chamber.name} · {chamber.membership.role}</option>)}</select></label>;
}
