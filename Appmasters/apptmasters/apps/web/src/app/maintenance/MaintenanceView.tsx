"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Issue = {
  id: string; description: string; urgency: string; status: string;
  createdAt: string; resolvedAt: string | null;
  reportedBy: { id: string; name: string; color?: string };
  room: { id: string; name: string } | null;
  logs: Array<{ id: string; newStatus: string | null; note: string; createdAt: string; changedBy: { name: string } }>;
};

type Contact = {
  id: string; method: string; summary: string; promise: string | null; contactedAt: string;
  contactedBy: { name: string };
  issue: { id: string; description: string } | null;
};

type Room = { id: string; name: string };

const STATUS_ORDER = ["Reported", "ContactedLandlord", "InProgress", "Resolved", "Closed"];
const STATUS_STYLE: Record<string, string> = {
  Reported: "bg-amber-100 text-amber-700",
  ContactedLandlord: "bg-blue-100 text-blue-700",
  InProgress: "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-500",
};
const URGENCY_STYLE: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  emergency: "bg-red-100 text-red-700",
};

export function MaintenanceView({
  issues, contacts, rooms, token,
}: {
  issues: unknown[]; contacts: unknown[]; rooms: unknown[]; token: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"issues" | "landlord">("issues");
  const [showReport, setShowReport] = useState(false);
  const [showContact, setShowContact] = useState<string | null>(null); // issueId
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const typedIssues = issues as Issue[];
  const typedContacts = contacts as Contact[];
  const typedRooms = rooms as Room[];

  const activeCount = typedIssues.filter((i) => i.status !== "Resolved" && i.status !== "Closed").length;

  async function updateStatus(issueId: string, status: string, note?: string) {
    await fetch(`${API_URL}/api/maintenance/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, note }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {activeCount > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">{activeCount} open issue{activeCount > 1 ? "s" : ""}</p>
          <button onClick={() => setShowReport(true)}
            className="text-xs bg-brand text-white px-3 py-1.5 rounded-full hover:bg-brand-dark">
            Report Issue
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["issues", "landlord"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-brand"}`}>
              {t === "issues" ? "Issues" : "Landlord Log"}
            </button>
          ))}
        </div>
        {activeCount === 0 && (
          <button onClick={() => setShowReport(true)}
            className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark">
            + Report Issue
          </button>
        )}
      </div>

      {showReport && (
        <ReportIssueForm rooms={typedRooms} token={token}
          onDone={() => { setShowReport(false); startTransition(() => router.refresh()); }}
          onCancel={() => setShowReport(false)} />
      )}

      {showContact !== null && (
        <LandlordContactForm issueId={showContact} token={token}
          onDone={() => { setShowContact(null); startTransition(() => router.refresh()); }}
          onCancel={() => setShowContact(null)} />
      )}

      {/* Issues */}
      {tab === "issues" && (
        <div className="space-y-3">
          {typedIssues.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No issues reported 👍</p>
            </div>
          )}
          {typedIssues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{issue.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {issue.room?.name ?? "No room"} · {issue.reportedBy.name} ·{" "}
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[issue.status] ?? ""}`}>
                      {issue.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${URGENCY_STYLE[issue.urgency] ?? ""}`}>
                      {issue.urgency}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {issue.status !== "Resolved" && issue.status !== "Closed" && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {STATUS_ORDER.filter((s) => s !== issue.status && s !== "Reported").map((s) => (
                      <button key={s} onClick={() => updateStatus(issue.id, s)}
                        className="text-xs border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 hover:border-brand hover:text-brand">
                        → {s}
                      </button>
                    ))}
                    <button onClick={() => setShowContact(issue.id)}
                      className="text-xs border border-blue-200 text-blue-600 rounded-full px-2.5 py-1 hover:bg-blue-50">
                      Log landlord contact
                    </button>
                  </div>
                )}

                {/* Log toggle */}
                {issue.logs.length > 0 && (
                  <button onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                    className="text-xs text-gray-400 hover:text-brand mt-2 block">
                    {expandedId === issue.id ? "Hide" : "Show"} history ({issue.logs.length})
                  </button>
                )}
              </div>

              {/* Expanded log */}
              {expandedId === issue.id && (
                <div className="border-t border-gray-50 px-4 py-3 space-y-2 bg-gray-50">
                  {issue.logs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs">
                      <span className="text-gray-400 shrink-0">{new Date(log.createdAt).toLocaleDateString()}</span>
                      {log.newStatus && (
                        <span className={`shrink-0 px-1.5 rounded ${STATUS_STYLE[log.newStatus] ?? "bg-gray-100"}`}>{log.newStatus}</span>
                      )}
                      <span className="text-gray-600">{log.note}</span>
                      <span className="text-gray-400 ml-auto shrink-0">{log.changedBy.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Landlord log */}
      {tab === "landlord" && (
        <div className="space-y-3">
          <button onClick={() => setShowContact(null === showContact ? "" : null)}
            className="w-full bg-white border border-dashed border-gray-300 rounded-2xl py-3 text-sm text-gray-500 hover:border-brand hover:text-brand">
            + Log landlord contact
          </button>
          {showContact === "" && (
            <LandlordContactForm issueId={undefined} token={token}
              onDone={() => { setShowContact(null); startTransition(() => router.refresh()); }}
              onCancel={() => setShowContact(null)} />
          )}
          {typedContacts.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-gray-400 text-sm">No landlord contacts logged yet</p>
            </div>
          )}
          {typedContacts.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.summary}</p>
                  {c.issue && <p className="text-xs text-gray-400 mt-0.5">Re: {c.issue.description}</p>}
                  {c.promise && <p className="text-xs text-blue-600 mt-0.5">Promise: {c.promise}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2">
                  {new Date(c.contactedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {c.contactedBy.name} · via {c.method}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportIssueForm({ rooms, token, onDone, onCancel }: {
  rooms: Room[]; token: string; onDone: () => void; onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [roomId, setRoomId] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "emergency">("medium");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_URL}/api/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description, roomId: roomId || undefined, urgency }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-brand/30 p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">Report Issue</h3>
      <textarea required value={description} onChange={(e) => setDescription(e.target.value)}
        rows={3} placeholder="Describe the issue…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand" />
      <div className="grid grid-cols-2 gap-3">
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="">No specific room</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading || !description}
          className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-50">
          {loading ? "Reporting…" : "Report Issue"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
      </div>
    </form>
  );
}

function LandlordContactForm({ issueId, token, onDone, onCancel }: {
  issueId?: string; token: string; onDone: () => void; onCancel: () => void;
}) {
  const [method, setMethod] = useState<"phone" | "email" | "in-person" | "text">("phone");
  const [summary, setSummary] = useState("");
  const [promise, setPromise] = useState("");
  const [contactedAt, setContactedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_URL}/api/maintenance/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        issueId: issueId || undefined,
        method, summary,
        promise: promise || undefined,
        contactedAt: new Date(contactedAt).toISOString(),
      }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-blue-200 p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">Log Landlord Contact</h3>
      <div className="grid grid-cols-2 gap-3">
        <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="text">Text</option>
          <option value="in-person">In person</option>
        </select>
        <input type="datetime-local" value={contactedAt}
          onChange={(e) => setContactedAt(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <textarea required value={summary} onChange={(e) => setSummary(e.target.value)}
        rows={2} placeholder="What was discussed?"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand" />
      <input value={promise} onChange={(e) => setPromise(e.target.value)}
        placeholder="What did they promise? (optional)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading || !summary}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Saving…" : "Log Contact"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
      </div>
    </form>
  );
}
