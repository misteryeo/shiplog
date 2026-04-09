"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { DraftMode, Tone } from "@/lib/posts/templates";

type GenerateClientProps = {
  selectedCount: number;
  idsParam: string;
};

export function GenerateClient({ selectedCount, idsParam }: GenerateClientProps) {
  const [mode, setMode] = useState<DraftMode>("batch");
  const [tone, setTone] = useState<Tone>("storyteller");

  const nextHref = useMemo(
    () => `/edit?ids=${idsParam}&mode=${mode}&tone=${tone}`,
    [idsParam, mode, tone],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Generate draft</h1>
        <p className="mt-1 text-sm text-stone-600">
          {selectedCount} feature{selectedCount === 1 ? "" : "s"} selected
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-900">Format</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("batch")}
            className={`rounded-lg border px-4 py-3 text-left text-sm ${
              mode === "batch"
                ? "border-stone-900 bg-stone-900 text-stone-50"
                : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            Batch post
          </button>
          <button
            type="button"
            onClick={() => setMode("individual")}
            className={`rounded-lg border px-4 py-3 text-left text-sm ${
              mode === "individual"
                ? "border-stone-900 bg-stone-900 text-stone-50"
                : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            Individual posts
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-900">Tone</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(["storyteller", "announcer", "teacher"] as Tone[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTone(option)}
              className={`rounded-lg border px-4 py-3 text-left text-sm capitalize ${
                tone === option
                  ? "border-stone-900 bg-stone-900 text-stone-50"
                  : "border-stone-300 text-stone-700 hover:bg-stone-100"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href={nextHref}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm text-stone-50"
        >
          Generate draft
        </Link>
      </div>
    </div>
  );
}
