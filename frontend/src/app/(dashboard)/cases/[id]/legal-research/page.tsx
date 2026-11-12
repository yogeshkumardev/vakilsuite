"use client";
import { useParams } from "next/navigation";
import { LegalResearchWorkspace } from "@/features/legal-research/LegalResearchWorkspace";
export default function LegalResearchPage() { const { id } = useParams<{ id: string }>(); return <LegalResearchWorkspace caseId={id} />; }
