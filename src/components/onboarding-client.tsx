"use client";

import { Cadence } from "@prisma/client";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type OnboardingClientProps = {
  linearConnected: boolean;
  notionConnected: boolean;
  currentCadence: Cadence;
  authError?: string;
};

export function OnboardingClient({
  linearConnected,
  notionConnected,
  currentCadence,
  authError,
}: OnboardingClientProps) {
  const [step, setStep] = useState(linearConnected ? 2 : 1);
  const [cadence, setCadence] = useState<Cadence>(currentCadence);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const previousLinearConnected = useRef(linearConnected);

  // After OAuth redirect, RSC payload can be one tick stale — refresh so Connection rows load.
  useEffect(() => {
    router.refresh();
  }, [router]);

  // When Linear first shows as connected (props update after OAuth), advance to cadence step.
  // Do not run when user chose "Back" from step 2 while already connected.
  useEffect(() => {
    if (!previousLinearConnected.current && linearConnected) {
      setStep(2);
    }
    previousLinearConnected.current = linearConnected;
  }, [linearConnected]);

  async function completeOnboarding() {
    setSaving(true);
    try {
      await fetch("/api/settings/cadence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadence }),
      });
      router.push("/review");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const errorMessage =
    authError === "Callback"
      ? "Connection failed during OAuth callback. Check credentials and try again."
      : authError === "OAuthCallback"
        ? "OAuth callback was rejected by provider. Try reconnecting."
        : authError
          ? `Connection failed: ${authError}`
          : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Welcome to ShipLog</h1>
        <p className="mt-2 text-sm text-stone-600">
          Connect your tools and set your cadence to start generating weekly shipped updates.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {step === 1 ? (
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-medium text-stone-900">Step 1: Connect your tools</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => signIn("linear", { callbackUrl: "/onboarding" })}
              className="rounded-lg border border-stone-300 px-4 py-3 text-left hover:bg-stone-100"
            >
              <p className="text-sm font-medium text-stone-900">Linear</p>
              <p className="text-xs text-stone-600">
                {linearConnected ? "Connected" : "Connect with read scope"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => signIn("notion", { callbackUrl: "/onboarding" })}
              className="rounded-lg border border-stone-300 px-4 py-3 text-left hover:bg-stone-100"
            >
              <p className="text-sm font-medium text-stone-900">Notion</p>
              <p className="text-xs text-stone-600">
                {notionConnected ? "Connected" : "Connect for PRD matching"}
              </p>
            </button>
          </div>
          <div className="mt-6 flex flex-col items-end gap-2">
            <p className="max-w-md text-right text-xs text-stone-500">
              Linear is required to pull shipped issues. Notion is optional for PRD matching.
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!linearConnected}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm text-stone-50 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Continue
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-medium text-stone-900">Step 2: Set your cadence</h2>
          <p className="mt-2 text-sm text-stone-600">
            ShipLog will prepare a fresh batch every Monday based on this window.
          </p>

          <div className="mt-4 grid gap-2">
            {[
              { value: Cadence.WEEKLY, label: "Weekly" },
              { value: Cadence.BIWEEKLY, label: "Every 2 weeks" },
              { value: Cadence.MONTHLY, label: "Monthly" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCadence(option.value)}
                className={`rounded-lg border px-4 py-3 text-left text-sm ${
                  cadence === option.value
                    ? "border-stone-900 bg-stone-900 text-stone-50"
                    : "border-stone-300 text-stone-700 hover:bg-stone-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={completeOnboarding}
              disabled={saving}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm text-stone-50 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Finish"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
