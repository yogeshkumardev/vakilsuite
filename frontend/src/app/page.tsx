import type { Metadata } from "next";

import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "VakilSuite — AI drafting for Allahabad High Court lawyers",
  description: "AI-powered legal drafting and typing for lawyers practising before the Allahabad High Court.",
};

export default function HomePage() {
  return <LandingPage />;
}
