"use client";

import { useEffect } from "react";

/**
 * Warns user before navigating away if there are unsaved changes.
 * Drop this into any page with an editor.
 */
export function UnsavedChangesGuard({ hasChanges }: { hasChanges: boolean }) {
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
            }
        };

        if (hasChanges) {
            window.addEventListener("beforeunload", handler);
        }

        return () => window.removeEventListener("beforeunload", handler);
    }, [hasChanges]);

    return null;
}
