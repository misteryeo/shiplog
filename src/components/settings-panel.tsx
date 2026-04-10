"use client";

import { Cadence } from "@prisma/client";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

type SettingsPanelProps = {
  cadence: Cadence;
  linearConnected: boolean;
  notionConnected: boolean;
};

export function SettingsPanel({
  cadence,
  linearConnected,
  notionConnected,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedCadence, setSelectedCadence] = useState<Cadence>(cadence);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function saveCadence(nextCadence: Cadence) {
    setSaving(true);
    try {
      await fetch("/api/settings/cadence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadence: nextCadence }),
      });
      setSelectedCadence(nextCadence);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function disconnectLinear() {
    setSaving(true);
    try {
      await fetch("/api/settings/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "LINEAR" }),
      });
      await signOut({ callbackUrl: "/onboarding" });
    } finally {
      setSaving(false);
    }
  }

  async function disconnectNotion() {
    setSaving(true);
    try {
      await fetch("/api/settings/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "NOTION" }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
      >
        Settings
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 bg-black/30">
          <aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-stone-50 p-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-lg font-medium text-stone-900">Settings</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-6">
              <section className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="text-sm font-medium text-stone-900">Connected tools</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">
                    Linear: {linearConnected ? "Connected" : "Disconnected"}
                  </span>
                  {linearConnected ? (
                    <button
                      type="button"
                      onClick={disconnectLinear}
                      disabled={saving}
                      className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-stone-700">
                    Notion: {notionConnected ? "Connected" : "Disconnected"}
                  </span>
                  {notionConnected ? (
                    <button
                      type="button"
                      onClick={disconnectNotion}
                      disabled={saving}
                      className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => signIn("notion", { callbackUrl: "/review" })}
                      disabled={saving}
                      className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 disabled:opacity-50"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="text-sm font-medium text-stone-900">Cadence</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: Cadence.WEEKLY, label: "Weekly" },
                    { value: Cadence.BIWEEKLY, label: "Every 2 weeks" },
                    { value: Cadence.MONTHLY, label: "Monthly" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => saveCadence(option.value)}
                      disabled={saving}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        selectedCadence === option.value
                          ? "border-stone-900 bg-stone-900 text-stone-50"
                          : "border-stone-300 text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
