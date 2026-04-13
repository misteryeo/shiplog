import { ConnectionProvider } from "@prisma/client";

import { fetchCompletedIssues } from "@/lib/linear/client";
import { fetchNotionPageExcerpt, searchNotionPages } from "@/lib/notion/client";
import { prisma } from "@/lib/prisma";

type SyncInput = {
  userId: string;
  startDate: string;
  endDate: string;
};

async function refreshLinearAccessToken(params: {
  refreshToken: string;
}) {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const clientSecret = process.env.LINEAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Linear OAuth client credentials are missing");
  }

  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: params.refreshToken,
    }).toString(),
    cache: "no-store",
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Linear token refresh failed: ${response.status} - ${rawBody}`);
  }

  const payload = JSON.parse(rawBody) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  return payload;
}

export async function syncLinearFeatures({ userId, startDate, endDate }: SyncInput) {
  const [connection, notionConnection] = await Promise.all([
    prisma.connection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: ConnectionProvider.LINEAR,
        },
      },
    }),
    prisma.connection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: ConnectionProvider.NOTION,
        },
      },
    }),
  ]);

  if (!connection) {
    throw new Error("Linear connection not found");
  }

  let issues;
  try {
    issues = await fetchCompletedIssues({
      accessToken: connection.accessToken,
      completedAtGte: new Date(startDate).toISOString(),
      completedAtLte: new Date(endDate).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Linear sync failed";
    const isAuthFailure = message.includes("Linear request failed: 401");

    if (!isAuthFailure || !connection.refreshToken) {
      throw error;
    }

    const refreshed = await refreshLinearAccessToken({
      refreshToken: connection.refreshToken,
    });

    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? connection.refreshToken,
        scope: refreshed.scope ?? connection.scope,
        expiresAt: refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : null,
      },
    });

    issues = await fetchCompletedIssues({
      accessToken: refreshed.access_token,
      completedAtGte: new Date(startDate).toISOString(),
      completedAtLte: new Date(endDate).toISOString(),
    });
  }

  for (const issue of issues) {
    let notionPageId: string | null = null;
    let notionPageTitle: string | null = null;
    let notionPageUrl: string | null = null;
    let notionMatchConfidence: string | null = null;
    let notionExcerpt: string | null = null;

    if (notionConnection) {
      try {
        const candidates = await searchNotionPages({
          accessToken: notionConnection.accessToken,
          query: issue.title,
          limit: 1,
        });
        const topMatch = candidates[0];

        if (topMatch) {
          notionPageId = topMatch.id;
          notionPageTitle = topMatch.title;
          notionPageUrl = topMatch.url;
          notionMatchConfidence = topMatch.confidence;
          notionExcerpt = await fetchNotionPageExcerpt({
            accessToken: notionConnection.accessToken,
            pageId: topMatch.id,
            maxChars: 500,
          });
        }
      } catch {
        notionPageId = null;
      }
    }

    await prisma.feature.upsert({
      where: {
        userId_linearIssueId: {
          userId,
          linearIssueId: issue.id,
        },
      },
      create: {
        userId,
        connectionId: connection.id,
        linearIssueId: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
        description: issue.description,
        completedAt: new Date(issue.completedAt),
        prData: issue.pullRequests,
        notionPageId,
        notionPageTitle,
        notionPageUrl,
        notionMatchConfidence,
        notionExcerpt,
        pulledAt: new Date(),
      },
      update: {
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
        description: issue.description,
        completedAt: new Date(issue.completedAt),
        prData: issue.pullRequests,
        notionPageId,
        notionPageTitle,
        notionPageUrl,
        notionMatchConfidence,
        notionExcerpt,
        pulledAt: new Date(),
      },
    });
  }

  return { count: issues.length };
}
