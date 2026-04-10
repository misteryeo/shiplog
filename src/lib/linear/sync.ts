import { ConnectionProvider } from "@prisma/client";

import { fetchCompletedIssues } from "@/lib/linear/client";
import { fetchNotionPageExcerpt, searchNotionPages } from "@/lib/notion/client";
import { prisma } from "@/lib/prisma";

type SyncInput = {
  userId: string;
  startDate: string;
  endDate: string;
};

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

  const issues = await fetchCompletedIssues({
    accessToken: connection.accessToken,
    completedAtGte: new Date(startDate).toISOString(),
    completedAtLte: new Date(endDate).toISOString(),
  });

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
