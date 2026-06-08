"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Message = {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  from: { id: string; name: string; color?: string };
};

export default function GroupChatPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const myId = (session?.user as { id?: string })?.id ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/comms/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    // Poll every 3 seconds for new messages
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    await fetch(`${API_URL}/api/comms/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    setText("");
    setSending(false);
    load();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Group Chat</h1>
            <p className="text-xs text-gray-400">All roommates</p>
          </div>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 overflow-y-auto pb-32">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const mine = msg.from.id === myId;
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: msg.from.color ?? "#6366f1" }}
                    >
                      {msg.from.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[75%] space-y-0.5`}>
                    {!mine && <p className="text-xs text-gray-400 px-1">{msg.from.name}</p>}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm ${
                        mine
                          ? "bg-indigo-600 text-white rounded-br-md"
                          : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="shared" className="rounded-xl max-w-full mb-1" />
                      )}
                      {msg.content && <p>{msg.content}</p>}
                    </div>
                    <p className={`text-xs text-gray-400 px-1 ${mine ? "text-right" : ""}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Message everyone…"
            className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
