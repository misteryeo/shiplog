const NOTION_VERSION = "2022-06-28";

type NotionSearchResult = {
  id: string;
  url: string;
  properties?: Record<string, unknown>;
};

type NotionSearchResponse = {
  results: NotionSearchResult[];
};

type NotionBlockResponse = {
  results: Array<Record<string, unknown>>;
};

export type NotionPageCandidate = {
  id: string;
  title: string;
  url: string;
  confidence: "high" | "low";
};

async function notionRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Notion request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeWhitespace(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreTitleSimilarity(featureTitle: string, pageTitle: string) {
  const featureTokens = new Set(normalizeWhitespace(featureTitle).split(" ").filter(Boolean));
  const pageTokens = new Set(normalizeWhitespace(pageTitle).split(" ").filter(Boolean));

  if (!featureTokens.size || !pageTokens.size) {
    return 0;
  }

  const overlap = Array.from(featureTokens).reduce(
    (count, token) => (pageTokens.has(token) ? count + 1 : count),
    0,
  );

  return overlap / Math.max(featureTokens.size, 1);
}

function extractPageTitle(result: NotionSearchResult) {
  const properties = result.properties ?? {};
  const titleProperty = Object.values(properties).find((value) => {
    if (!value || typeof value !== "object") {
      return false;
    }
    return (value as { type?: string }).type === "title";
  }) as { title?: Array<{ plain_text?: string }> } | undefined;

  const fromTitle =
    titleProperty?.title?.map((item) => item.plain_text ?? "").join(" ").trim() ?? "";
  return fromTitle || "Untitled page";
}

function plainTextFromRichText(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => {
      if (typeof item === "object" && item && "plain_text" in item) {
        return String((item as { plain_text?: string }).plain_text ?? "");
      }
      return "";
    })
    .join(" ")
    .trim();
}

function extractBlockText(block: Record<string, unknown>) {
  const blockType = typeof block.type === "string" ? block.type : null;
  if (!blockType) {
    return "";
  }

  const nested = block[blockType];
  if (!nested || typeof nested !== "object") {
    return "";
  }

  const richText = (nested as { rich_text?: unknown }).rich_text;
  return plainTextFromRichText(richText);
}

export async function searchNotionPages(params: {
  accessToken: string;
  query: string;
  limit?: number;
}) {
  const payload = await notionRequest<NotionSearchResponse>(params.accessToken, "/search", {
    method: "POST",
    body: JSON.stringify({
      query: params.query,
      page_size: params.limit ?? 5,
      filter: { property: "object", value: "page" },
    }),
  });

  return payload.results.map((result) => {
    const title = extractPageTitle(result);
    const confidence = scoreTitleSimilarity(params.query, title) >= 0.5 ? "high" : "low";

    return {
      id: result.id,
      title,
      url: result.url,
      confidence,
    } satisfies NotionPageCandidate;
  });
}

export async function fetchNotionPageExcerpt(params: {
  accessToken: string;
  pageId: string;
  maxChars?: number;
}) {
  const payload = await notionRequest<NotionBlockResponse>(
    params.accessToken,
    `/blocks/${params.pageId}/children?page_size=100`,
    { method: "GET" },
  );

  const text = payload.results
    .map((block) => extractBlockText(block))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const maxChars = params.maxChars ?? 500;
  return text.slice(0, maxChars);
}
