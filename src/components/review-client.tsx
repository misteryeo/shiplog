"use client";

import type { Feature } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ReviewClientProps = {
  initialFeatures: Feature[];
  initialStartDate: string;
  initialEndDate: string;
  initialSelectedIds?: string[];
  notionConnected: boolean;
};

type NotionCandidate = {
  id: string;
  title: string;
  url: string;
  confidence: "high" | "low";
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
  initialSelectedIds = [],
  notionConnected,
}: ReviewClientProps) {
  const [features, setFeatures] = useState(initialFeatures);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [swapFeature, setSwapFeature] = useState<Feature | null>(null);
  const [swapQuery, setSwapQuery] = useState("");
  const [swapResults, setSwapResults] = useState<NotionCandidate[]>([]);

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
    setSyncError(null);
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
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSyncError(payload?.error ?? "Refresh failed. Please try again.");
        return;
      }

      const idQuery =
        selectedIds.length > 0 ? `&ids=${encodeURIComponent(selectedIds.join(","))}` : "";
      window.location.search = `?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}${idQuery}`;
    } finally {
      setSyncing(false);
    }
  }

  function getPRCount(prData: unknown) {
    return Array.isArray(prData) ? prData.length : 0;
  }

  function openSwap(feature: Feature) {
    setSwapFeature(feature);
    setSwapQuery(feature.title);
    setSwapResults([]);
  }

  async function searchSwapMatches() {
    if (!swapQuery.trim()) {
      return;
    }

    setSearching(true);
    try {
      const response = await fetch("/api/notion/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: swapQuery }),
      });

      if (!response.ok) {
        setSwapResults([]);
        return;
      }

      const payload = (await response.json()) as { results: NotionCandidate[] };
      setSwapResults(payload.results);
    } finally {
      setSearching(false);
    }
  }

  async function applySwap(candidate: NotionCandidate) {
    if (!swapFeature) {
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/features/${swapFeature.id}/notion-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: candidate.id,
          pageTitle: candidate.title,
          pageUrl: candidate.url,
          confidence: candidate.confidence,
        }),
      });

      if (!response.ok) {
        return;
      }

      setFeatures((current) =>
        current.map((feature) =>
          feature.id === swapFeature.id
            ? {
                ...feature,
                notionPageId: candidate.id,
                notionPageTitle: candidate.title,
                notionPageUrl: candidate.url,
                notionMatchConfidence: candidate.confidence,
              }
            : feature,
        ),
      );
      setSwapFeature(null);
    } finally {
      setSearching(false);
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
        {syncError ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {syncError}
          </p>
        ) : null}
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
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <a
                        href={feature.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-violet-700 hover:text-violet-900"
                      >
                        {feature.identifier}
                        <ExternalLink className="size-3" />
                      </a>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {getPRCount(feature.prData)} PRs
                      </span>
                      {feature.notionPageUrl ? (
                        <a
                          href={feature.notionPageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 hover:text-emerald-900"
                        >
                          PRD ↗
                        </a>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          No PRD
                        </span>
                      )}
                    </div>
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
                      {feature.notionExcerpt ||
                        feature.description ||
                        "No issue description provided."}
                    </p>
                    <p>
                      <span className="font-medium text-stone-900">How:</span> See feature for
                      details.
                    </p>
                    <div className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2">
                      <p className="text-xs text-stone-600">
                        {feature.notionPageTitle
                          ? `PRD: ${feature.notionPageTitle}`
                          : "No matched PRD yet."}
                      </p>
                      <button
                        type="button"
                        onClick={() => openSwap(feature)}
                        disabled={!notionConnected}
                        className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Swap match
                      </button>
                    </div>
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
                ? `/generate?${new URLSearchParams({
                    ids: selectedIds.join(","),
                    start: startDate,
                    end: endDate,
                  }).toString()}`
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

      {swapFeature ? (
        <div className="fixed inset-0 z-40 bg-black/30 p-4">
          <div className="mx-auto mt-24 w-full max-w-xl rounded-xl border border-stone-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-900">Swap PRD match</h2>
              <button
                type="button"
                onClick={() => setSwapFeature(null)}
                className="rounded-md px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
              >
                Close
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={swapQuery}
                onChange={(event) => setSwapQuery(event.target.value)}
                placeholder="Search Notion pages"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
              />
              <button
                type="button"
                onClick={searchSwapMatches}
                disabled={searching}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {swapResults.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => applySwap(candidate)}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-left hover:bg-stone-50"
                >
                  <p className="text-sm text-stone-900">{candidate.title}</p>
                  <p className="text-xs text-stone-500">
                    Confidence: {candidate.confidence}
                  </p>
                </button>
              ))}
              {!swapResults.length ? (
                <p className="text-xs text-stone-500">
                  Run a search to pick a different Notion PRD.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
