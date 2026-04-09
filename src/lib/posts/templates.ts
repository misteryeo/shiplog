export type Tone = "storyteller" | "announcer" | "teacher";
export type DraftMode = "batch" | "individual";

type FeatureForDraft = {
  identifier: string;
  title: string;
  description: string | null;
  prData: unknown;
};

function getToneIntro(tone: Tone) {
  if (tone === "storyteller") {
    return "Shipping is never one big moment - it is a series of sharp, practical improvements. Here is what we shipped recently:";
  }
  if (tone === "teacher") {
    return "A quick breakdown of what we shipped, why it matters, and what customers can do with it:";
  }
  return "New shipped updates from our team:";
}

function normalizeWhat(prData: unknown): string {
  if (!Array.isArray(prData)) {
    return "Implementation details are available in the linked pull requests.";
  }

  const firstPR = prData.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "body" in item &&
      typeof (item as Record<string, unknown>).body === "string",
  ) as { body: string } | undefined;

  return firstPR?.body?.trim() || "Implementation details are available in the linked pull requests.";
}

export function buildBatchDraft(features: FeatureForDraft[], tone: Tone) {
  const intro = getToneIntro(tone);
  const bullets = features
    .map(
      (feature) =>
        `- ${feature.title}: ${feature.description?.trim() || "Customer-impact summary coming soon."}`,
    )
    .join("\n");

  return `${intro}\n\n${bullets}\n\nIf one of these is relevant to your workflow, I would love your feedback.`;
}

export function buildIndividualDraft(feature: FeatureForDraft, tone: Tone) {
  const opening =
    tone === "storyteller"
      ? `One small change made a big difference: ${feature.title}.`
      : tone === "teacher"
        ? `Feature breakdown: ${feature.title}.`
        : `Now shipped: ${feature.title}.`;

  const why = feature.description?.trim() || "This shipped to remove friction for customers.";
  const what = normalizeWhat(feature.prData);

  return `${opening}\n\nWhy it matters:\n${why}\n\nWhat changed:\n${what}\n\nHow to try it:\nSee ${feature.identifier} for details.`;
}
