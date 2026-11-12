"use client";

import { Notification, notificationsApi } from "@/lib/api/notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await notificationsApi.getAll();
            return res;
        },
        refetchInterval: 30000, // Poll every 30 seconds
    });

    const unread = data?.unread_count ?? 0;
    const notifications = data?.notifications ?? [];

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleMarkAllRead = async () => {
        await notificationsApi.markAllRead();
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleClick = async (n: Notification) => {
        if (!n.is_read) {
            await notificationsApi.markRead(n.id);
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
        setOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                title="Notifications"
                onClick={() => setOpen((v) => !v)}
                className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed bottom-20 left-3 right-3 z-50 rounded-lg border border-slate-200 bg-white shadow-lg md:absolute md:bottom-auto md:left-0 md:right-auto md:top-full md:mt-2 md:w-80">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <span className="text-sm font-bold text-slate-900">Notifications</span>
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-400">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${
                                        !n.is_read ? "bg-blue-50/50" : ""
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.is_read ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                                            {n.title}
                                        </p>
                                        {n.message && (
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                {n.message}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {new Date(n.created_at).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
