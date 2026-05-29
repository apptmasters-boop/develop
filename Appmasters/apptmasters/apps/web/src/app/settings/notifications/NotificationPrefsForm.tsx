"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Prefs = {
  choreReminders: boolean;
  expenseAlerts: boolean;
  settleReminders: boolean;
  weeklyDigest: boolean;
  nudgesEnabled: boolean;
  settleThresholdCents: number;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const TOGGLES: Array<{ key: keyof Prefs; label: string; description: string }> = [
  { key: "choreReminders", label: "Chore reminders", description: "24h before + overdue alerts" },
  { key: "expenseAlerts", label: "Expense alerts", description: "When a new expense is added that includes you" },
  { key: "settleReminders", label: "Settle-up reminders", description: "Reminders to pay outstanding balances" },
  { key: "weeklyDigest", label: "Weekly digest", description: "Sunday summary of your chores and balances" },
  { key: "nudgesEnabled", label: "Accept nudges", description: "Let roommates send you gentle chore reminders" },
];

export function NotificationPrefsForm({ prefs, token }: { prefs: Prefs | null; token: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<Prefs>(
    prefs ?? {
      choreReminders: true, expenseAlerts: true, settleReminders: true,
      weeklyDigest: true, nudgesEnabled: true, settleThresholdCents: 1000,
      quietHoursStart: "22:00", quietHoursEnd: "08:00",
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Prefs) {
    setValues((v) => ({ ...v, [key]: !v[key] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch(`${API_URL}/api/notifications/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...values,
        settleThresholdDollars: values.settleThresholdCents / 100,
      }),
    });
    setSaving(false);
    setSaved(true);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {TOGGLES.map(({ key, label, description }) => (
          <div key={key} className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
            <button
              onClick={() => toggle(key as keyof Prefs)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                values[key as keyof Prefs] ? "bg-brand" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  values[key as keyof Prefs] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Quiet Hours</h3>
        <p className="text-xs text-gray-400">No notifications between these times</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="time" value={values.quietHoursStart}
              onChange={(e) => setValues((v) => ({ ...v, quietHoursStart: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="time" value={values.quietHoursEnd}
              onChange={(e) => setValues((v) => ({ ...v, quietHoursEnd: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Settle-up threshold</h3>
        <p className="text-xs text-gray-400">Only remind me when I owe more than:</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">$</span>
          <input type="number" min="0" step="1"
            value={values.settleThresholdCents / 100}
            onChange={(e) => setValues((v) => ({ ...v, settleThresholdCents: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full bg-brand text-white rounded-xl py-3 text-sm font-medium hover:bg-brand-dark disabled:opacity-60 transition-colors">
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Preferences"}
      </button>
    </div>
  );
}
