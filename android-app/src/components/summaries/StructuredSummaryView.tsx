import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Muted } from "@/components/ui/Screen";
import { DocumentViewer, type ViewerFile } from "@/components/DocumentViewer";
import type { components } from "@/types/generated-api";
export function StructuredSummaryView({view,caseId,runId}:{view:components["schemas"]["SummaryView"];caseId:string;runId:string}) {
    const [sectionKey,setSectionKey]=useState("all");
    const [timeline,setTimeline]=useState("Incident Factual");
    const [file,setFile]=useState<ViewerFile|null>(null);
    const close=useCallback(()=>setFile(null),[]);
    function source(link:components["schemas"]["SourceLink"]) { setFile({name:"Original source",mime:"application/pdf",pageNumber:link.page_number,summarySource:{caseId,runId,findingId:link.finding_id,citationIndex:link.citation_index}}); }
    return <View style={{gap:12}}>
        <Muted>Structured summary · {view.executive_word_count} executive-summary words. Documented statements are not automatically proven facts.</Muted>
        <ScrollView horizontal contentContainerStyle={{gap:8}} accessibilityLabel="Summary sections"><Button variant="secondary" onPress={()=>setSectionKey("all")}>All sections</Button>{view.sections.map(s=><Button key={s.key} variant={sectionKey===s.key?"primary":"secondary"} onPress={()=>setSectionKey(s.key)}>{String(s.number).padStart(2,"0")} · {s.title}</Button>)}</ScrollView>
        {view.sections.filter(s=>sectionKey==="all"||sectionKey===s.key).map(section=><View key={section.key} style={{gap:8}}><Text accessibilityRole="header" style={{fontSize:19,fontWeight:"700",color:"#0f172a"}}>{String(section.number).padStart(2,"0")} · {section.title}</Text>
            {section.key==="chronological_timeline"&&<View style={{gap:8}}>{["Incident Factual","Procedural Court"].map(label=><Button key={label} variant={timeline===label?"primary":"secondary"} onPress={()=>setTimeline(label)}>{label==="Incident Factual"?"Incident / Factual":"Procedural / Court"}</Button>)}</View>}
            {section.blocks.filter(b=>section.key!=="chronological_timeline"||b.title===timeline).map((block,i)=><Card key={i}><Text style={{fontWeight:"700",fontSize:16}}>{block.title}</Text>{block.cells.map((cell,j)=><View key={j} style={{gap:6,marginTop:10}}><Text style={{fontWeight:"600"}}>{cell.label}</Text><Text style={{fontSize:15,lineHeight:23}}>{cell.text}</Text>{(cell.sources??[]).map((link,k)=><Button key={k} variant="secondary" onPress={()=>source(link)}>Original {link.filename ?? link.document_id.slice(0,8)} · page {link.page_number}</Button>)}</View>)}</Card>)}
        </View>)}
        {view.uncertainties.length>0&&<Card><Text style={{fontWeight:"700"}}>Uncertainties requiring advocate review</Text>{view.uncertainties.map((text,i)=><Text key={i}>{text}</Text>)}</Card>}
        {file&&<DocumentViewer file={file} onClose={close}/>}
    </View>;
}
