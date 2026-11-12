"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { summariesApi } from "@/lib/api/summaries";
import type { components } from "@/types/generated-api";
type View = components["schemas"]["SummaryView"];
type Source = components["schemas"]["SourceLink"];
const button = "min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600";
function OriginalDialog({source,caseId,runId,onClose}:{source:Source;caseId:string;runId:string;onClose:()=>void}) {
    const dialog=useRef<HTMLDialogElement>(null);
    const generation=useAuthStore(s=>s.generation);
    const query=useQuery({queryKey:["summary-original",generation,caseId,runId,source.finding_id,source.citation_index],queryFn:()=>summariesApi.source(caseId,runId,source.finding_id,source.citation_index),retry:false,staleTime:0,gcTime:0});
    useEffect(()=>{const element=dialog.current;element?.showModal();return ()=>element?.close();},[]);
    return <dialog ref={dialog} onCancel={onClose} aria-label="Original source document" className="h-[90dvh] w-[95vw] max-w-6xl rounded-lg border p-0 backdrop:bg-slate-900/50"><div className="flex h-full flex-col"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-3"><div><h3 className="font-semibold">{query.data?.filename??"Original source"}</h3><p className="text-sm">Requested original page {source.page_number}. If your PDF viewer does not jump automatically, navigate to this page.</p></div><button className={button} onClick={onClose}>Close original</button></div>{query.isPending&&<p role="status" className="p-4">Opening original…</p>}{query.error&&<div role="alert" className="p-4"><p>{query.error.message}</p><button className={button} onClick={()=>void query.refetch()}>Retry / refresh access</button></div>}{query.data&&<><button className={button} onClick={()=>void query.refetch()}>Refresh source link</button><iframe title={`${query.data.filename} · page ${source.page_number}`} src={`${query.data.url}#page=${source.page_number}`} referrerPolicy="no-referrer" className="min-h-0 w-full flex-1 border-0"/></>}</div></dialog>;
}
export function StructuredSummaryView({view,caseId,runId}:{view:View;caseId:string;runId:string}) {
    const [source,setSource]=useState<Source|null>(null);
    const [timeline,setTimeline]=useState("Incident Factual");
    const renderCell=(cell:components["schemas"]["SummaryCell"]) => <><p className="whitespace-pre-wrap break-words text-sm leading-6">{cell.text}</p><div className="mt-2 flex flex-wrap gap-2">{(cell.sources??[]).map((s,i)=><button key={`${s.finding_id}:${s.citation_index}:${i}`} className={`${button} text-indigo-700`} onClick={()=>setSource(s)}>Original {s.filename ?? s.document_id.slice(0,8)} · p. {s.page_number}</button>)}</div></>;
    return <div className="space-y-5">
        <p className="text-sm text-slate-600">Structured summary · {view.executive_word_count} executive-summary words. Documented statements are not automatically proven facts.</p>
        <nav aria-label="Summary sections" className="flex flex-wrap gap-2">{view.sections.map(s=><a key={s.key} href={`#summary-${s.key}`} className={button}>{String(s.number).padStart(2,"0")} · {s.title}</a>)}</nav>
        {view.sections.map(section=><section key={section.key} id={`summary-${section.key}`} className="scroll-mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4"><h2 className="text-xl font-semibold">{String(section.number).padStart(2,"0")} · {section.title}</h2>
            {section.key==="chronological_timeline"&&<div className="flex flex-wrap gap-2" role="group" aria-label="Timeline type">{["Incident Factual","Procedural Court"].map(label=><button key={label} aria-pressed={timeline===label} className={`${button} ${timeline===label?"bg-indigo-50 text-indigo-800":""}`} onClick={()=>setTimeline(label)}>{label==="Incident Factual"?"Incident / Factual":"Procedural / Court"}</button>)}</div>}
            {section.blocks.filter(b=>section.key!=="chronological_timeline"||b.title===timeline).map((block,index)=><article key={index} className={`space-y-2 rounded-md border p-3 ${block.kind==="analysis"?"border-amber-200 bg-amber-50":"border-slate-200"}`}><h3 className="font-semibold">{block.title}</h3>
                {(block.kind==="timeline"||block.kind==="matrix")?<><div className="hidden overflow-x-auto lg:block"><table className="w-full table-fixed border-collapse text-left"><thead><tr>{block.cells.map((c,i)=><th key={i} scope="col" className="border-b p-2 text-sm">{c.label}</th>)}</tr></thead><tbody><tr>{block.cells.map((cell,i)=><td key={i} className="p-2 align-top">{renderCell(cell)}</td>)}</tr></tbody></table></div><dl className="space-y-3 lg:hidden">{block.cells.map((cell,i)=><div key={i}><dt className="text-sm font-semibold">{cell.label}</dt><dd>{renderCell(cell)}</dd></div>)}</dl></>:block.cells.map((cell,i)=><div key={i}><p className="text-sm font-medium text-slate-600">{cell.label}</p>{renderCell(cell)}</div>)}
            </article>)}
        </section>)}
        {view.uncertainties.length>0&&<aside className="rounded-md border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold">Uncertainties requiring advocate review</h2><ul className="list-disc pl-5">{view.uncertainties.map((text,i)=><li key={i}>{text}</li>)}</ul></aside>}
        {source&&<OriginalDialog source={source} caseId={caseId} runId={runId} onClose={()=>setSource(null)}/>}
    </div>;
}
