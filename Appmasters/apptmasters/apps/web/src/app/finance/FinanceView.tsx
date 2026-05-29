"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Balance = { userId: string; name: string; color: string | null; net: number; owes: number; paid: number };
type Member = { id: string; user: { id: string; name: string; color?: string } };
type Expense = {
  id: string; description: string; amount: number; category: string;
  splitMethod: string; status: string; createdAt: string;
  addedBy: { id: string; name: string; color?: string };
  splits: Array<{ userId: string; amount: number; settled: boolean; user: { name: string } }>;
};
type Settlement = {
  id: string; amount: number; note: string | null; createdAt: string;
  confirmedByFrom: boolean; confirmedByTo: boolean;
  from: { id: string; name: string; color?: string };
  to: { id: string; name: string; color?: string };
};
type RecurringExpense = { id: string; description: string; amount: number; dayOfMonth: number; active: boolean };

const CATEGORIES = ["rent", "utilities", "groceries", "supplies", "subscriptions", "other"];

function paymentDeeplink(app: "venmo" | "paypal" | "cashapp", toName: string, amount: number, note: string) {
  const encoded = encodeURIComponent(note);
  const amountStr = amount.toFixed(2);
  if (app === "venmo") return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(toName)}&amount=${amountStr}&note=${encoded}`;
  if (app === "cashapp") return `cashme://${encodeURIComponent(toName)}/${amountStr}`;
  return `https://paypal.me/${encodeURIComponent(toName)}/${amountStr}`;
}

export function FinanceView({
  expenses,
  balance,
  recurring,
  settlements,
  members,
  currentUserId,
  token,
}: {
  expenses: unknown[];
  balance: unknown[];
  recurring: unknown[];
  settlements: unknown[];
  members: unknown[];
  currentUserId: string;
  token: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"expenses" | "balances" | "recurring">("balances");
  const [showAdd, setShowAdd] = useState(false);
  const [showSettle, setShowSettle] = useState<Balance | null>(null);
  const [settleNote, setSettleNote] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  const typedBalance = balance as Balance[];
  const typedExpenses = expenses as Expense[];
  const typedRecurring = recurring as RecurringExpense[];
  const typedSettlements = settlements as Settlement[];
  const typedMembers = members as Member[];

  const myBalance = typedBalance.find((b) => b.userId === currentUserId);
  const iOwe = typedBalance.filter((b) => b.userId !== currentUserId && b.net > 0);

  async function confirmSettlement(settlementId: string) {
    await fetch(`${API_URL}/api/finances/settle/${settlementId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    startTransition(() => router.refresh());
  }

  async function submitSettle() {
    if (!showSettle) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) return;
    await fetch(`${API_URL}/api/finances/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ toUserId: showSettle.userId, amount, note: settleNote }),
    });
    setShowSettle(null);
    setSettleNote("");
    setSettleAmount("");
    startTransition(() => router.refresh());
  }

  const pendingSettlements = typedSettlements.filter(
    (s) => (s.to.id === currentUserId || s.from.id === currentUserId) && !(s.confirmedByFrom && s.confirmedByTo)
  );

  return (
    <div className="space-y-4">
      {/* My balance card */}
      {myBalance && (
        <div className={`rounded-2xl p-5 ${myBalance.net >= 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Your balance</p>
          <p className={`text-3xl font-bold ${myBalance.net >= 0 ? "text-green-700" : "text-red-600"}`}>
            {myBalance.net >= 0 ? "+" : ""}${Math.abs(myBalance.net).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {myBalance.net >= 0 ? "Others owe you" : "You owe others"}
          </p>
        </div>
      )}

      {/* Pending settlements */}
      {pendingSettlements.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending Confirmations</p>
          {pendingSettlements.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{s.from.name}</span> → <span className="font-medium">{s.to.name}</span>
                <span className="text-gray-400 ml-1">${s.amount.toFixed(2)}</span>
              </p>
              {s.to.id === currentUserId && !s.confirmedByTo && (
                <button
                  onClick={() => confirmSettlement(s.id)}
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700"
                >
                  Confirm
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-dark"
        >
          + Add Expense
        </button>
        {iOwe.length > 0 && (
          <button
            onClick={() => setShowSettle(iOwe[0])}
            className="flex-1 border border-gray-200 bg-white rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:border-brand"
          >
            Settle Up
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["balances", "expenses", "recurring"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-brand"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Add expense modal */}
      {showAdd && (
        <AddExpenseForm
          members={typedMembers}
          currentUserId={currentUserId}
          token={token}
          onDone={() => { setShowAdd(false); startTransition(() => router.refresh()); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Settle modal */}
      {showSettle && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-900">Settle up with {showSettle.name}</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Amount ($)</label>
              <input type="number" min="0.01" step="0.01" value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder={Math.abs(showSettle.net).toFixed(2)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Note (optional)</label>
              <input value={settleNote} onChange={(e) => setSettleNote(e.target.value)}
                placeholder="e.g. Venmo sent"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            {/* Payment deeplinks */}
            {settleAmount && parseFloat(settleAmount) > 0 && (
              <div className="flex gap-2">
                {(["venmo", "cashapp", "paypal"] as const).map((app) => (
                  <a key={app} href={paymentDeeplink(app, showSettle.name, parseFloat(settleAmount), settleNote || "ApptMasters settle up")}
                    className="flex-1 border border-gray-200 rounded-lg py-1.5 text-xs text-center text-gray-600 hover:border-brand hover:text-brand capitalize">
                    {app}
                  </a>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={submitSettle} disabled={!settleAmount}
                className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                Mark Sent
              </button>
              <button onClick={() => setShowSettle(null)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balances tab */}
      {tab === "balances" && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {typedBalance.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No expenses yet</p>
          )}
          {typedBalance.map((b) => (
            <div key={b.userId} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ backgroundColor: b.color ?? "#6366f1" }}>
                {b.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{b.name} {b.userId === currentUserId && "(you)"}</p>
                <p className="text-xs text-gray-400">Paid ${b.paid.toFixed(2)} · owes ${b.owes.toFixed(2)}</p>
              </div>
              <span className={`text-sm font-semibold ${b.net >= 0 ? "text-green-600" : "text-red-500"}`}>
                {b.net >= 0 ? "+" : ""}${b.net.toFixed(2)}
              </span>
              {b.userId !== currentUserId && b.net < 0 && myBalance && myBalance.net < 0 && (
                <button onClick={() => setShowSettle(b)}
                  className="text-xs text-brand border border-brand rounded-full px-2 py-0.5 hover:bg-brand/5">
                  Settle
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expenses tab */}
      {tab === "expenses" && (
        <div className="space-y-2">
          {typedExpenses.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No expenses yet</p>
            </div>
          )}
          {typedExpenses.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{e.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Paid by {e.addedBy.name} · {e.category} ·{" "}
                    {new Date(e.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-base font-semibold text-gray-900">${e.amount.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {e.splits.map((s) => (
                  <span key={s.userId}
                    className={`text-xs px-2 py-0.5 rounded-full ${s.settled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {s.user.name} ${s.amount.toFixed(2)} {s.settled ? "✓" : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recurring tab */}
      {tab === "recurring" && (
        <div className="space-y-2">
          {typedRecurring.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No recurring expenses</p>
            </div>
          )}
          {typedRecurring.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{r.description}</p>
                <p className="text-xs text-gray-400">Day {r.dayOfMonth} each month</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">${r.amount.toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                {r.active ? "Active" : "Paused"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddExpenseForm({
  members, currentUserId, token, onDone, onCancel,
}: {
  members: Member[];
  currentUserId: string;
  token: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [splitMethod, setSplitMethod] = useState<"equal" | "single">("equal");
  const [participants, setParticipants] = useState<string[]>(
    members.map((m) => m.user.id)
  );
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_URL}/api/finances`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        description,
        amount: parseFloat(amount),
        category,
        splitMethod,
        participants: splitMethod === "single" ? [currentUserId] : participants,
      }),
    });
    setLoading(false);
    onDone();
  }

  function toggleParticipant(userId: string) {
    setParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-brand/30 p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">New Expense</h3>
      <input required value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="What was it for?" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
      <div className="grid grid-cols-2 gap-3">
        <input required type="number" min="0.01" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="Amount ($)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        {(["equal", "single"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setSplitMethod(m)}
            className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors ${splitMethod === m ? "border-brand text-brand bg-brand/5" : "border-gray-200 text-gray-600"}`}>
            {m === "equal" ? "Split equally" : "I paid alone"}
          </button>
        ))}
      </div>
      {splitMethod === "equal" && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Split between:</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button key={m.user.id} type="button" onClick={() => toggleParticipant(m.user.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${participants.includes(m.user.id) ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-500"}`}>
                {m.user.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={loading || !description || !amount}
          className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-50">
          {loading ? "Adding…" : "Add Expense"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
      </div>
    </form>
  );
}
