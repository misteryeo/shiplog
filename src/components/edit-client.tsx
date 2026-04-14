"use client";

import type { Feature } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildBatchDraft,
  buildIndividualDraft,
  type DraftMode,
  type Tone,
} from "@/lib/posts/templates";

type EditClientProps = {
  features: Feature[];
  mode: DraftMode;
  tone: Tone;
  idsParam: string;
  startDate: string | null;
  endDate: string | null;
};

type CharacterTarget = {
  min: number;
  max: number;
};

const INDIVIDUAL_TARGET: CharacterTarget = {
  min: 500,
  max: 900,
};

function getBatchTarget(featureCount: number): CharacterTarget {
  const min = Math.min(1400, Math.max(700, featureCount * 220));
  const max = Math.min(2200, Math.max(1000, featureCount * 320));
  return { min, max };
}

function enforceCharacterLimit(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

export function EditClient({
  features,
  mode,
  tone,
  idsParam,
  startDate,
  endDate,
}: EditClientProps) {
  const backToGenerateHref = useMemo(() => {
    const params = new URLSearchParams();
    if (idsParam) params.set("ids", idsParam);
    params.set("mode", mode);
    params.set("tone", tone);
    if (startDate && endDate) {
      params.set("start", startDate);
      params.set("end", endDate);
    }
    return `/generate?${params.toString()}`;
  }, [idsParam, mode, tone, startDate, endDate]);

  const batchTarget = useMemo(() => getBatchTarget(features.length), [features.length]);
  const initialBatch = useMemo(
    () => enforceCharacterLimit(buildBatchDraft(features, tone), batchTarget.max),
    [features, tone, batchTarget.max],
  );
  const initialIndividual = useMemo(
    () =>
      Object.fromEntries(
        features.map((feature) => [
          feature.id,
          enforceCharacterLimit(buildIndividualDraft(feature, tone), INDIVIDUAL_TARGET.max),
        ]),
      ),
    [features, tone],
  );

  const [batchDraft, setBatchDraft] = useState(initialBatch);
  const [individualDrafts, setIndividualDrafts] = useState<Record<string, string>>(
    initialIndividual,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentFeature = features[currentIndex];

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (mode === "batch") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-8">
        <div>
          <Link
            href={backToGenerateHref}
            className="text-sm text-violet-700 hover:text-violet-900 hover:underline"
          >
            ← Back to format &amp; selection
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stone-900">Edit draft</h1>
          <span className="rounded-md border border-stone-300 px-2 py-1 text-xs capitalize text-stone-600">
            {tone}
          </span>
        </div>

        <textarea
          value={batchDraft}
          onChange={(event) => setBatchDraft(enforceCharacterLimit(event.target.value, batchTarget.max))}
          maxLength={batchTarget.max}
          className="h-[420px] w-full rounded-xl border border-stone-300 bg-white p-4 text-sm text-stone-900"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {batchDraft.length} characters (target {batchTarget.min}-{batchTarget.max})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBatchDraft(initialBatch)}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => copyText(batchDraft)}
              className="rounded-md bg-stone-900 px-3 py-2 text-sm text-stone-50"
            >
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentFeature) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-8">
        <Link
          href={backToGenerateHref}
          className="text-sm text-violet-700 hover:text-violet-900 hover:underline"
        >
          ← Back to format &amp; selection
        </Link>
        <p className="text-sm text-stone-600">No features selected.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-8">
      <div>
        <Link
          href={backToGenerateHref}
          className="text-sm text-violet-700 hover:text-violet-900 hover:underline"
        >
          ← Back to format &amp; selection
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Edit drafts</h1>
        <span className="rounded-md border border-stone-300 px-2 py-1 text-xs capitalize text-stone-600">
          {tone}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {features.map((feature, index) => (
          <button
            key={feature.id}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={`rounded-md px-3 py-1 text-xs font-mono ${
              index === currentIndex
                ? "bg-stone-900 text-stone-50"
                : "border border-stone-300 text-stone-700"
            }`}
          >
            {feature.identifier}
          </button>
        ))}
      </div>

      <textarea
        value={individualDrafts[currentFeature.id] ?? ""}
        onChange={(event) =>
          setIndividualDrafts((current) => ({
            ...current,
            [currentFeature.id]: enforceCharacterLimit(event.target.value, INDIVIDUAL_TARGET.max),
          }))
        }
        maxLength={INDIVIDUAL_TARGET.max}
        className="h-[420px] w-full rounded-xl border border-stone-300 bg-white p-4 text-sm text-stone-900"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500">
          {(individualDrafts[currentFeature.id] ?? "").length} characters (target{" "}
          {INDIVIDUAL_TARGET.min}-{INDIVIDUAL_TARGET.max})
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((value) => Math.min(features.length - 1, value + 1))}
            disabled={currentIndex >= features.length - 1}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setIndividualDrafts((current) => ({
                ...current,
                [currentFeature.id]: enforceCharacterLimit(
                  buildIndividualDraft(currentFeature, tone),
                  INDIVIDUAL_TARGET.max,
                ),
              }))
            }
            className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => copyText(individualDrafts[currentFeature.id] ?? "")}
            className="rounded-md bg-stone-900 px-3 py-2 text-sm text-stone-50"
          >
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
