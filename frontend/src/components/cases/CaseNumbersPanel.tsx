"use client";

import { useState } from "react";
import {
  useAddCaseNumber,
  useDeleteCaseNumber,
} from "@/features/cases/hooks/useCases";
import {
  CaseNumber,
  CaseNumberType,
  CASE_NUMBER_TYPE_LABELS,
} from "@/types/api";
import { CONTROL_CLASS } from "@/components/ui/Field";
import { Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

interface CaseNumbersPanelProps {
  caseId: string;
  caseNumbers: CaseNumber[];
  canEdit: boolean;
}

export function CaseNumbersPanel({
  caseId,
  caseNumbers,
  canEdit,
}: CaseNumbersPanelProps) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    number_type: "high_court" as CaseNumberType,
    case_number: "",
    court_name: "",
    year: "",
    is_primary: false,
  });

  const addNumber = useAddCaseNumber(caseId);
  const deleteNumber = useDeleteCaseNumber(caseId);

  const handleAdd = async () => {
    if (!form.case_number.trim()) return;
    await addNumber.mutateAsync({
      number_type: form.number_type,
      case_number: form.case_number,
      court_name: form.court_name || undefined,
      year: form.year ? Number(form.year) : undefined,
      is_primary: form.is_primary,
    });
    setForm({
      number_type: "high_court",
      case_number: "",
      court_name: "",
      year: "",
      is_primary: false,
    });
    setAdding(false);
  };

  const inputClass = `${CONTROL_CLASS} h-9`;

  const TYPE_COLORS: Record<CaseNumberType, string> = {
    high_court: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    lower_court: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    supreme_court: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    connected_matter: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    other: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Case Numbers</h3>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>

      <div className="space-y-2">
        {caseNumbers.length === 0 && !adding && (
          <p className="text-xs text-slate-400 py-2">
            No case numbers added yet.
          </p>
        )}

        {caseNumbers.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[n.number_type]}`}
              >
                {CASE_NUMBER_TYPE_LABELS[n.number_type]}
              </span>
              <span className="text-sm font-mono font-medium text-slate-800">
                {n.case_number}
              </span>
              {n.year && (
                <span className="text-xs text-slate-400">({n.year})</span>
              )}
              {n.court_name && (
                <span className="text-xs text-slate-500">· {n.court_name}</span>
              )}
              {n.is_primary && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Primary
                </span>
              )}
            </div>
            {canEdit && (
              <IconButton
                onClick={() => deleteNumber.mutate(n.id)}
                disabled={deleteNumber.isPending}
                className="ml-2"
                label="Remove case number"
                tone="danger"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.number_type}
              onChange={(e) =>
                setForm((v) => ({
                  ...v,
                  number_type: e.target.value as CaseNumberType,
                }))
              }
              className={inputClass}
            >
              {Object.entries(CASE_NUMBER_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={form.case_number}
              onChange={(e) =>
                setForm((v) => ({ ...v, case_number: e.target.value }))
              }
              className={inputClass}
              placeholder="Case number"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.court_name}
              onChange={(e) =>
                setForm((v) => ({ ...v, court_name: e.target.value }))
              }
              className={inputClass}
              placeholder="Court name (optional)"
            />
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((v) => ({ ...v, year: e.target.value }))}
              className={inputClass}
              placeholder="Year"
              min={1900}
              max={2100}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) =>
                  setForm((v) => ({ ...v, is_primary: e.target.checked }))
                }
                className="rounded"
              />
              Set as primary
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={addNumber.isPending || !form.case_number.trim()}
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {addNumber.isPending ? "…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
