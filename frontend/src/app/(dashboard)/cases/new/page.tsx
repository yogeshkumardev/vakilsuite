"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

const CaseForm = dynamic(
    () => import("@/components/cases/CaseForm").then((m) => m.CaseForm),
    {
        ssr: false,
    },
);

// export const metadata = { title: "New Case — VakilSuite" };

export default function NewCasePage() {
    const user = useAuthStore((state) => state.user);
    if (user?.role === "munshi") {
        return <WorkspacePage variant="form"><PageHeader title="Lawyer account required" description="Your account can work on cases assigned to you." /><Link href="/cases" className="text-sm text-indigo-700 underline">Back to assigned cases</Link></WorkspacePage>;
    }
    return (
        <WorkspacePage variant="form">
            <PageHeader
                title="New Case"
                description="Create a case with basic details. You can upload documents and add more details after creation."
            />
            <Surface className="p-6">
                <CaseForm />
            </Surface>
        </WorkspacePage>
    );
}
