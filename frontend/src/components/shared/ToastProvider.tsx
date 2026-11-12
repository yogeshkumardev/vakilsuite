"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X } from "lucide-react";

type Toast = { id: string; message: string; tone?: "success" | "info" | "warning" };
const ToastContext = createContext<{ show: (toast: Toast) => void; dismiss: (id: string) => void }>({ show: () => undefined, dismiss: () => undefined });
export const useToast = () => useContext(ToastContext).show;
export const useDismissToast = () => useContext(ToastContext).dismiss;

function ToastItem({ item, dismiss }: { item: Toast; dismiss: (id: string) => void }) {
    useEffect(() => {
        if (item.tone === "warning") return; // Recovery guidance remains until dismissed.
        const timer = setTimeout(() => dismiss(item.id), 6000);
        return () => clearTimeout(timer);
    }, [item, dismiss]);
    const Icon = item.tone === "success" ? CheckCircle2 : Info;
    return <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-lg">
        <Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${item.tone === "warning" ? "text-amber-700" : item.tone === "success" ? "text-emerald-700" : "text-indigo-600"}`} />
        <p className="min-w-0 flex-1 break-words leading-6">{item.message}</p>
        <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"><X aria-hidden className="h-4 w-4" /></button>
    </div>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<Toast[]>([]);
    const show = useCallback((item: Toast) => setItems(current => {
        const existing = current.find(t => t.id === item.id);
        if (existing?.message === item.message && existing.tone === item.tone) return current;
        return [...current.filter(t => t.id !== item.id), item].slice(-3);
    }), []);
    const dismiss = useCallback((id: string) => setItems(current => current.filter(t => t.id !== id)), []);
    return <ToastContext.Provider value={{ show, dismiss }}>{children}
        <div aria-label="Notifications" role="region" aria-live="polite" aria-relevant="additions text" className="pointer-events-none fixed inset-x-3 top-4 z-[100] flex flex-col gap-3 sm:left-auto sm:right-5 sm:w-96">
            {items.map(item => <ToastItem key={item.id} item={item} dismiss={dismiss} />)}
        </div>
    </ToastContext.Provider>;
}
