"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { summariesApi, type FactCardCoverage } from "@/lib/api/summaries";

type Citation = { section: number; finding: number; citation: number; page: number | null };

export function FactCardDrawer({caseId, card, onClose}: {caseId:string;card:FactCardCoverage;onClose:()=>void}) {
    const [selected, setSelected] = useState<Citation | null>(null);
    const sections = card.content?.sections ?? [];
    const first = sections.flatMap((section, sectionIndex) => (section.findings??[]).flatMap((finding, findingIndex) => finding.citations.map((citation, citationIndex) => ({section:sectionIndex,finding:findingIndex,citation:citationIndex,page:citation.page_number ?? null}))))[0] ?? null;
    const citation = selected ?? first;
    const source = useQuery({
        queryKey:["fact-card-source",caseId,card.card_id,citation?.section,citation?.finding,citation?.citation],
        queryFn:()=>summariesApi.factCardSource(caseId,card.card_id!,citation!.section,citation!.finding,citation!.citation),
        enabled:Boolean(card.card_id && citation),refetchOnWindowFocus:false,staleTime:240000,
    });
    useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[onClose]);
    return <div className="fixed inset-0 z-50 bg-slate-950/50" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
        <aside role="dialog" aria-modal="true" aria-label={`Facts from ${card.title}`} className="ml-auto flex h-full w-full max-w-6xl flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between gap-3 border-b p-4"><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{card.title}</h2><p className="text-xs text-slate-600">Cited document fact card · source revision {card.revision_id}</p></div><button autoFocus type="button" className="min-h-11 rounded border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600" onClick={onClose}>Close</button></header>
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
                <div className="min-h-[36vh] border-b bg-slate-100 md:min-h-0 md:border-b-0 md:border-r">
                    {source.isPending&&<p role="status" className="p-4 text-sm">Loading cited original…</p>}
                    {source.error&&<div className="p-4 text-sm text-red-800">Cited original unavailable. <button className="underline" onClick={()=>void source.refetch()}>Retry</button></div>}
                    {source.data?.mime_type==="application/pdf"&&<iframe key={`${source.data.url}:${source.data.page_number}`} title={`Original ${source.data.filename}, page ${source.data.page_number}`} src={`${source.data.url}#page=${source.data.page_number}`} className="h-full w-full border-0" referrerPolicy="no-referrer"/>}
                    {source.data&&source.data.mime_type!=="application/pdf"&&<div className="p-4"><a className="text-sm text-indigo-700 underline" href={source.data.url} target="_blank" rel="noopener noreferrer">Open cited original, page {source.data.page_number}</a></div>}
                </div>
                <div className="min-h-0 overflow-y-auto p-4"><p className="mb-4 text-sm text-slate-600">Select a citation to open its original page. AI extracted these facts; check them against the document.</p>
                    {sections.length===0&&<p className="text-sm">No cited facts were extracted.</p>}
                    {sections.map((section,sectionIndex)=><section key={`${section.name}:${sectionIndex}`} className="mb-5"><h3 className="mb-2 font-semibold capitalize">{section.name.replaceAll("_"," ")}</h3><ul className="space-y-3">{(section.findings??[]).map((finding,findingIndex)=><li key={findingIndex} className="rounded border p-3 text-sm"><p className="whitespace-pre-wrap break-words">{finding.text}</p><p className="mt-1 text-xs text-slate-600">{finding.finding_type.replaceAll("_"," ")}</p><div className="mt-2 flex flex-wrap gap-2">{finding.citations.map((sourceCitation,citationIndex)=><button key={citationIndex} type="button" className="min-h-9 rounded border border-indigo-200 px-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600" onClick={()=>setSelected({section:sectionIndex,finding:findingIndex,citation:citationIndex,page:sourceCitation.page_number??null})}>Original page {sourceCitation.page_number??"?"}</button>)}</div></li>)}</ul></section>)}
                </div>
            </div>
        </aside>
    </div>;
}
