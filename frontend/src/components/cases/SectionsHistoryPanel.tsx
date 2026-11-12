"use client";

import { useState } from "react";
import {
  useAddSection,
  useRemoveSection,
  useSectionsHistory,
} from "@/features/cases/hooks/useCases";
import { CaseSection } from "@/types/api";
import { CONTROL_CLASS } from "@/components/ui/Field";
import { Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

interface SectionsHistoryPanelProps {
  caseId: string;
  activeSections: CaseSection[];
  canEdit: boolean;
}

export function SectionsHistoryPanel({
  caseId,
  activeSections,
  canEdit,
}: SectionsHistoryPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSection, setNewSection] = useState({
    section: "",
    act_name: "IPC",
  });

  const { data: historyData } = useSectionsHistory(caseId);
  const addSection = useAddSection(caseId);
  const removeSection = useRemoveSection(caseId);

  const history = historyData ?? [];
  const removedSections = history.filter((s) => !s.is_active);

  const handleAdd = async () => {
    if (!newSection.section.trim() || !newSection.act_name.trim()) return;
    await addSection.mutateAsync(newSection);
    setNewSection({ section: "", act_name: "IPC" });
    setAdding(false);
  };

  const inputClass = `${CONTROL_CLASS} h-9`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Sections</h3>
        <div className="flex items-center gap-3">
          {removedSections.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              {showHistory
                ? "Hide history"
                : `Show history (${removedSections.length} removed)`}
            </button>
          )}
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
      </div>

      {/* Active sections */}
      <div className="space-y-1.5">
        {activeSections.length === 0 && !adding && (
          <p className="text-xs text-slate-400 py-2">No sections added yet.</p>
        )}
        {activeSections.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
          >
            <div>
              <span className="text-sm font-medium text-slate-800">
                Section {s.section}
              </span>
              <span className="text-xs text-slate-500 ml-2">{s.act_name}</span>
            </div>
            {canEdit && (
              <IconButton
                onClick={() => removeSection.mutate(s.id)}
                disabled={removeSection.isPending}
                label="Remove section"
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
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newSection.section}
            onChange={(e) =>
              setNewSection((v) => ({ ...v, section: e.target.value }))
            }
            className={inputClass}
            placeholder="Section e.g. 302"
            autoFocus
          />
          <input
            value={newSection.act_name}
            onChange={(e) =>
              setNewSection((v) => ({ ...v, act_name: e.target.value }))
            }
            className={inputClass}
            placeholder="Act e.g. IPC"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={addSection.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {addSection.isPending ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* History — removed sections */}
      {showHistory && removedSections.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Removed
          </p>
          {removedSections.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 opacity-60"
            >
              <div>
                <span className="text-sm line-through text-slate-500">
                  Section {s.section}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  {s.act_name}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Removed {new Date(s.removed_at!).toLocaleDateString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
