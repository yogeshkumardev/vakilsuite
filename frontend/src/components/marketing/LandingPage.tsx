"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpenCheck, Check, CheckCircle2, ChevronDown, FilePlus2, Landmark, LockKeyhole, Menu, Mic, Scale, ShieldCheck, Sparkles, X } from "lucide-react";
import "./landing-page.css";
import "./landing-header.css";

const steps = [
  [FilePlus2, "Add your matter", "Upload papers, paste notes, or start from an approved format."],
  [BookOpenCheck, "Build the context", "Keep facts, issues, authorities, and reliefs together in one matter."],
  [Sparkles, "Draft with sources", "Create structured drafts supported by your trusted knowledge base."],
  [CheckCircle2, "Review and approve", "You stay in control before anything becomes final or leaves your workspace."],
] as const;

const faqs = [
  ["Kya mera client data safe hai?", "Haan. VakilSuite is designed with India data residency and encryption in transit and at rest, so your client material stays protected within your workspace."],
  ["Kya AI galat citation de sakta hai?", "Har citation humare knowledge base se verified hota hai — koi random internet source nahi. You can inspect the source before approving a draft."],
  ["Kya AI final draft khud file kar dega?", "Nahi. Har draft aapki review aur approval ke baad hi final hota hai. VakilSuite assists your work; filing decisions always stay with you."],
  ["Konsa court format support karte ho?", "Abhi VakilSuite Allahabad High Court ke drafting workflows ke liye focused hai. Baaki UP courts jald hi support kiye jayenge."],
] as const;

function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow?: string; title: string; description?: string; centered?: boolean }) {
  return <div className={`landing-heading${centered ? " is-centered" : ""}`}>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2>{description && <span>{description}</span>}</div>;
}

function ProductPreview() {
  return <div className="product-preview" aria-label="VakilSuite drafting workspace preview">
    <div className="preview-bar"><b>VakilSuite</b><span>Writ Petition (Civil) No. 1234 of 2026</span><i>● Saved</i><button>Export</button></div>
    <div className="preview-content"><aside><FilePlus2 /><BookOpenCheck /><Scale /><Mic /></aside><article><div className="preview-tools">Paragraph　 <b>B</b>　<i>I</i>　 <u>U</u></div><div className="preview-document"><strong>IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD</strong><small>Writ Petition (Civil) No. 1234 of 2026</small><p>Aarav Verma <em>…Petitioner</em></p><p>State of Uttar Pradesh &amp; Others <em>…Respondents</em></p><h4>WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA</h4><p>Most Respectfully Showeth:</p><p>1. That the present petition is filed for issuance of an appropriate writ against the impugned order dated 12.03.2024. <sup>[1]</sup></p><p>2. That the petitioner has no equally efficacious alternative remedy available in this matter. <sup>[2]</sup></p></div><div className="review-bar"><ShieldCheck /> Draft reviewed by you <button>Approve draft</button></div></article><aside className="citations"><b>Citations <i>12</i></b><p><CheckCircle2 /> Verified citation</p><div><strong>State of U.P. v. Manohar Lal</strong><span>AIR 2016 All 123</span><span>Allahabad High Court</span><small>Grounded in your approved sources.</small></div><div><strong>Prem Shankar Shukla</strong><span>(1980) 3 SCC 526</span></div></aside></div>
  </div>;
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="landing-page">
    <header><div className="container nav-wrap"><Link href="/" className="logo">Vakil<span>Suite</span></Link><nav className={menuOpen ? "open" : ""}><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#security" onClick={() => setMenuOpen(false)}>Security</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><Link href="/login">Sign in</Link><Link href="/register" className="button">Start drafting <ArrowRight /></Link></nav><button className="menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div></header>

    <section className="hero"><div className="container hero-grid"><div><h1>Draft with clarity.<br />Argue with confidence.</h1><p>AI-powered drafting and typing for lawyers practising before the Allahabad High Court, Prayagraj.</p><p className="proof">Citations grounded in your private knowledge base. Every draft stays lawyer-approved.</p><div className="actions"><Link href="/register" className="button">Start drafting <ArrowRight /></Link><a href="#how-it-works" className="text-link">See how it works <ArrowRight /></a></div><small className="hero-note"><ShieldCheck /> Built for advocates. Backed by privacy. Secured by design.</small></div><ProductPreview /></div></section>

    <section className="trust"><div className="container trust-bar"><div><Landmark /><b>Made for lawyers at the Allahabad High Court</b></div><div><LockKeyhole /><span><b>Private knowledge base</b>Your files and authorities stay within your workspace.</span></div><div><ShieldCheck /><span><b>Human in the loop</b>Every final draft is reviewed and approved by you.</span></div><div><ShieldCheck /><span><b>Secure by design</b>Security controls built around confidential legal work.</span></div></div></section>

    <section id="how-it-works" className="process"><div className="container"><SectionHeading eyebrow="How it works" title="From intake to a court-ready draft, in four clear steps." /><div className="steps">{steps.map(([Icon, title, description], index) => <article key={title}><div>{index + 1}</div><Icon /><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

    <section className="features"><div className="container"><SectionHeading eyebrow="Featured capabilities" title="Built for how lawyers draft and type." /><div className="feature-layout"><article className="feature-main"><div className="feature-copy"><Sparkles /><h3>AI drafting workspace</h3><p>Draft petitions, applications, replies, and more with citations from your matter file and trusted legal sources.</p><ul><li><Check /> Grounded citation suggestions</li><li><Check /> Paragraph-level refinement</li><li><Check /> Structured export when ready</li></ul></div><div className="editor-mini"><b>VakilSuite</b><span>Writ Petition</span><p>Beg May It Please Your Lordships,</p><p>The present writ petition is filed under Article 226 of the Constitution seeking appropriate reliefs against the impugned order.</p><aside><BookOpenCheck /><div><b>State of U.P. v. Manohar Lal</b><br />Writ jurisdiction is wide and is to be exercised to prevent manifest injustice.</div></aside></div></article><div className="side-features"><article><Mic /><h3>Type from dictation</h3><p>Dictate in English or Hindi. VakilSuite adds punctuation and formats it for legal drafting.</p><button><Mic /> Start dictation</button></article><article><BookOpenCheck /><h3>Context that stays connected</h3><p>Notes, authorities, and drafts remain linked to the matter, so context is never lost.</p><a href="#how-it-works">Explore the workflow <ArrowRight /></a></article></div></div></div></section>

    <section id="security" className="privacy"><div className="container privacy-grid"><div><SectionHeading eyebrow="Private by design" title="Your client data stays in India. Encrypted." description="A legal workspace needs more than convenience. VakilSuite is designed around data residency, encryption, and controlled access." /><ul><li><CheckCircle2 /> Client data is stored in secure data centres in India.</li><li><CheckCircle2 /> Data is encrypted in transit and at rest.</li><li><CheckCircle2 /> Access controls limit matters to authorised users.</li></ul></div><div className="privacy-art"><span>INDIA</span><div><LockKeyhole /></div><i /><i /><i /><b>DATA STORED SECURELY IN INDIA</b></div></div></section>

    <section className="testimonials"><div className="container"><SectionHeading eyebrow="Built with advocates" title="Built with lawyers. Backed by legal minds." centered /><div className="quotes"><blockquote><span>“</span><p>VakilSuite helps me spend less time formatting and finding the right precedent. The structure stays clear, and I keep full control of the final draft.</p><footer><b>Advocate Rohan Srivastava</b><small>High Court, Allahabad</small></footer></blockquote><blockquote><span>“</span><p>The workflow is built for real chamber work. Context stays connected, citations are easier to verify, and nothing is final until I approve it.</p><footer><b>Advocate Neha Tiwari</b><small>Civil &amp; Commercial Practice</small></footer></blockquote></div></div></section>

    <section className="comparison"><div className="container"><SectionHeading title="Less manual work. More time for the law." centered /><div className="comparison-table"><b>Manual drafting</b><b>With VakilSuite</b>{[["Hours spent locating notes and authorities", "Matter-aware drafting with grounded sources"],["Repeated formatting for each document", "Court-focused drafting workflows"],["Higher risk of missing a relevant precedent", "Citations traceable to your knowledge base"],["Context scattered across files and messages", "One connected matter workspace"],["Final quality varies across revisions", "Structured review before you approve"]].flatMap(([manual, vakil]) => [<span key={manual}><X />{manual}</span>, <span key={vakil}><Check />{vakil}</span>])}</div></div></section>

    <section id="faq" className="faq"><div className="container narrow"><SectionHeading eyebrow="FAQs" title="Quick answers to common questions." centered /><div className="faq-list">{faqs.map(([question, answer], index) => <article key={question}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown className={openFaq === index ? "rotate" : ""} /></button>{openFaq === index && <p>{answer}</p>}</article>)}</div></div></section>

    <section className="final-cta"><Scale /><div className="container"><p>For advocates who care about every word.</p><h2>Your next draft deserves a better starting point.</h2><Link href="/register" className="button light">Start drafting <ArrowRight /></Link></div></section>
    <footer><div className="container footer-inner"><Link href="/" className="logo">Vakil<span>Suite</span></Link><p>AI-powered drafting for advocates.</p><nav><a href="#how-it-works">Product</a><a href="#security">Security</a><a href="#faq">Support</a></nav><small>© {new Date().getFullYear()} VakilSuite. All rights reserved.</small></div></footer>
  </main>;
}
