"use client";

import { Menu } from "lucide-react";

export function Header({ onOpenNavigation }: { onOpenNavigation: () => void }) {
    return (
        <header className="flex h-11 shrink-0 items-center border-b border-slate-200 bg-white px-3 md:hidden">
            <button
                type="button"
                onClick={onOpenNavigation}
                aria-label="Open navigation"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
                <Menu className="h-5 w-5" />
            </button>
        </header>
    );
}
