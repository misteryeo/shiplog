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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanRichText(value: string) {
  return normalizeWhitespace(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/^\s*[-*]\s\[[ xX]\]\s*/gm, "")
      .replace(/\*\*|__/g, "")
      .replace(/\*|_/g, "")
      .replace(/\r/g, " "),
  );
}

function splitIntoSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter(Boolean);
}

function firstSentence(value: string, fallback: string) {
  const cleaned = cleanRichText(value);
  if (!cleaned) return fallback;
  const [sentence] = splitIntoSentences(cleaned);
  return sentence || fallback;
}

function collectPRHighlights(prData: unknown) {
  if (!Array.isArray(prData)) return [];

  const highlights: string[] = [];
  for (const item of prData) {
    if (typeof item !== "object" || item === null) continue;
    const body = "body" in item && typeof item.body === "string" ? item.body : "";
    if (!body.trim()) continue;

    const lines = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => Boolean(line) && !line.startsWith("##") && !line.startsWith("###"));

    for (const line of lines) {
      const cleaned = cleanRichText(line).replace(/^[-*+]\s*/, "");
      if (cleaned && cleaned.length > 20) {
        highlights.push(cleaned);
      }
      if (highlights.length >= 3) break;
    }

    if (highlights.length >= 3) break;
  }

  return highlights;
}

function buildCustomerSummary(feature: FeatureForDraft) {
  const why = firstSentence(
    feature.description ?? "",
    "We heard this workflow could be smoother for customers.",
  );
  const prHighlights = collectPRHighlights(feature.prData);
  const shipped = prHighlights[0]
    ? firstSentence(prHighlights[0], "We shipped targeted improvements to this workflow.")
    : "We shipped targeted improvements to this workflow.";
  const impact = prHighlights[1]
    ? firstSentence(prHighlights[1], "Customers should see faster, more reliable results.")
    : "Customers should see faster, more reliable results.";

  return { why, shipped, impact };
}

export function buildBatchDraft(features: FeatureForDraft[], tone: Tone) {
  const intro = getToneIntro(tone);
  const bullets = features
    .map((feature) => {
      const { why, shipped } = buildCustomerSummary(feature);
      return `- ${feature.title}: ${shipped} (${why})`;
    })
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

  const { why, shipped, impact } = buildCustomerSummary(feature);

  return `${opening}\n\nThe challenge:\n${why}\n\nWhat we shipped:\n${shipped}\n\nWhat this means for customers:\n${impact}\n\nHow to try it:\nSee ${feature.identifier} for details.`;
}
