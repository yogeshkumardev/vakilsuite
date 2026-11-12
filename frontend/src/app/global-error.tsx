"use client";
export default function GlobalError({ reset, unstable_retry }: { error: Error & { digest?: string }; reset: () => void; unstable_retry?: () => void }) {
    return <html lang="en"><body style={{margin:0,fontFamily:"system-ui, sans-serif",background:"#f8fafc",color:"#0f172a"}}>
        <main style={{maxWidth:440,margin:"15vh auto",padding:32,textAlign:"center",background:"white",border:"1px solid #e2e8f0",borderRadius:16}}>
            <h1>Let’s reopen VakilSuite</h1>
            <p>The workspace stopped unexpectedly. Try again to load your saved work. Unsaved edits may need to be entered again.</p>
            <button onClick={unstable_retry ?? reset} style={{minHeight:44,padding:"0 24px",background:"#4f46e5",color:"white",border:0,borderRadius:6,cursor:"pointer"}}>Try again</button>
            <p><button onClick={() => window.location.assign("/cases")} style={{color:"#4338ca",background:"transparent",border:0,minHeight:44,cursor:"pointer",textDecoration:"underline"}}>Back to cases</button></p>
        </main>
    </body></html>;
}
