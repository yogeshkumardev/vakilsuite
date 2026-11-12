"use client";

import { useState, useRef, useEffect } from "react";
import { courtroomApi, Message, CourtroomSession } from "@/lib/api/courtroom";
import { Send, Scale, Users } from "lucide-react";

export function CourtroomChat({ session, onSessionEnd }: { session: CourtroomSession; onSessionEnd: () => void }) {
    const [messages, setMessages] = useState<Message[]>(session.messages || []);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isJudge = session.session_type === "judge";
    const AIName = isJudge ? "Hon'ble Judge" : "Opposing Counsel";
    const AIIcon = isJudge ? Scale : Users;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userText = input;
        setInput("");
        
        // Optimistic update
        setMessages((prev) => [
            ...prev,
            { role: "lawyer", content: userText, timestamp: new Date().toISOString() },
            { role: "ai", content: "", timestamp: new Date().toISOString() } // Placeholder
        ]);

        setIsStreaming(true);
        let streamedResponse = "";

        await courtroomApi.streamMessage(
            session.id,
            userText,
            (chunk) => {
                streamedResponse += chunk;
                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = streamedResponse;
                    return newMessages;
                });
            },
            () => {
                setIsStreaming(false);
            },
            (error) => {
                console.error("Stream failed", error);
                setIsStreaming(false);
            }
        );
    };

    const handleEndSession = async () => {
        if (!confirm("Are you sure you want to end this session? The AI will analyze your weaknesses.")) return;
        try {
            await courtroomApi.endSession(session.id);
            onSessionEnd();
        } catch (error) {
            console.error("Failed to end session", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isJudge ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        <AIIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">{AIName}</h2>
                        <p className="text-xs text-slate-500">Practice Session (Turn {Math.floor(messages.length / 2)})</p>
                    </div>
                </div>
                {session.status === "active" && (
                    <button
                        onClick={handleEndSession}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md"
                    >
                        End & Analyze
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        Start your argument to begin the session.
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'lawyer' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-4 ${
                                msg.role === 'lawyer' 
                                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                    : 'bg-slate-100 text-slate-900 rounded-tl-none'
                            }`}>
                                <div className="text-xs opacity-70 mb-1">
                                    {msg.role === 'lawyer' ? 'You' : AIName}
                                </div>
                                <div className="whitespace-pre-wrap">{msg.content || (isStreaming && i === messages.length - 1 ? '...' : '')}</div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {session.status === "active" && (
                <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="State your argument..."
                        disabled={isStreaming}
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-3 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            )}
        </div>
    );
}
