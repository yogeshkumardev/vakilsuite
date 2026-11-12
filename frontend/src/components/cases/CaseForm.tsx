"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCase } from "@/features/cases/hooks/useCases";
import { CASE_TYPE_LABELS } from "@/types/api";
import { CONTROL_CLASS } from "@/components/ui/Field";

const caseSchema = z.object({
    case_title: z.string().min(3, "Title must be at least 3 characters"),
    case_type: z.enum([
        "writ_petition",
        "pil",
        "criminal_revision",
        "criminal_appeal",
        "bail_application",
        "anticipatory_bail",
        "quashing",
        "civil_revision",
        "first_appeal",
        "second_appeal",
        "contempt",
        "other",
    ]),
    petitioner_name: z.string().min(2, "Required"),
});

type CaseFormData = z.infer<typeof caseSchema>;

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
                {label}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

const inputClass = `${CONTROL_CLASS} h-10`;
const selectClass = `${inputClass} cursor-pointer`;

export function CaseForm() {
    const router = useRouter();
    const createCase = useCreateCase();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<CaseFormData>({
        resolver: zodResolver(caseSchema),
        defaultValues: {
            case_type: "bail_application",
        },
    });

    const onSubmit = async (data: CaseFormData) => {
        try {
            const created = await createCase.mutateAsync(data);
            router.push(`/cases/${created.id}`);
        } catch (e: unknown) {
            setError("root", {
                message:
                    e instanceof Error
                        ? e.message
                        : "Something went wrong. Please try again.",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4">
                <Field label="Case Title" error={errors.case_title?.message}>
                    <input
                        {...register("case_title")}
                        className={inputClass}
                        placeholder="e.g. John Doe Bail Application 2026"
                    />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Case Type" error={errors.case_type?.message}>
                        <select {...register("case_type")} className={selectClass}>
                            {Object.entries(CASE_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field
                        label="Petitioner Name"
                        error={errors.petitioner_name?.message}
                    >
                        <input
                            {...register("petitioner_name")}
                            className={inputClass}
                            placeholder="Full name"
                        />
                    </Field>
                </div>
            </div>

            {errors.root?.message && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errors.root.message}
                </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                <button
                    type="button"
                    onClick={() => router.push("/cases")}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={createCase.isPending}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                    {createCase.isPending ? "Creating..." : "Create Case"}
                </button>
            </div>
        </form>
    );
}
