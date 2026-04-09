"use client";

import type { Feature } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";

type ReviewClientProps = {
  initialFeatures: Feature[];
  initialStartDate: string;
  initialEndDate: string;
};

function getWhat(prData: unknown) {
  if (!Array.isArray(prData) || prData.length === 0) {
    return "No linked pull request descriptions were found.";
  }

  const first = prData[0] as { body?: string };
  return first?.body?.trim() || "No linked pull request descriptions were found.";
}

export function ReviewClient({
  initialFeatures,
  initialStartDate,
  initialEndDate,
}: ReviewClientProps) {
  const [features, setFeatures] = useState(initialFeatures);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [syncing, setSyncing] = useState(false);

  const allSelected = useMemo(
    () => features.length > 0 && selectedIds.length === features.length,
    [features.length, selectedIds.length],
  );

  function toggleSelected(featureId: string) {
    setSelectedIds((current) =>
      current.includes(featureId)
        ? current.filter((id) => id !== featureId)
        : [...current, featureId],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : features.map((item) => item.id));
  }

  async function refresh() {
    setSyncing(true);
    try {
      const response = await fetch("/api/linear/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        return;
      }

      window.location.search = `?start=${startDate}&end=${endDate}`;
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-stone-700">
            Start
            <input
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
            />
          </label>
          <label className="text-sm text-stone-700">
            End
            <input
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              className="mt-1 block rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
            />
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={syncing}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-50"
          >
            {syncing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {features.map((feature) => (
          <article key={feature.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-stone-900"
                checked={selectedIds.includes(feature.id)}
                onChange={() => toggleSelected(feature.id)}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-stone-900">{feature.title}</h3>
                    <p className="font-mono text-xs text-stone-500">{feature.identifier}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [feature.id]: !current[feature.id],
                      }))
                    }
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700"
                  >
                    {expanded[feature.id] ? "Hide details" : "Show details"}
                  </button>
                </div>

                {expanded[feature.id] ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm text-stone-700">
                    <p>
                      <span className="font-medium text-stone-900">What:</span>{" "}
                      {getWhat(feature.prData)}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">Why:</span>{" "}
                      {feature.description || "No issue description provided."}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">How:</span> See feature for
                      details.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {features.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-600">
            No shipped features in this range yet. Try refreshing after adjusting dates.
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-4 rounded-xl border border-stone-900 bg-stone-900 p-3 text-stone-50 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm">{selectedIds.length} selected</span>
          <Link
            href={
              selectedIds.length
                ? `/generate?ids=${selectedIds.join(",")}`
                : "#"
            }
            className={`rounded-md px-3 py-2 text-sm ${
              selectedIds.length
                ? "bg-white text-stone-900"
                : "cursor-not-allowed bg-stone-700 text-stone-300"
            }`}
            onClick={(event) => {
              if (!selectedIds.length) event.preventDefault();
            }}
          >
            Generate post -&gt;
          </Link>
        </div>
      </div>
    </div>
  );
}
