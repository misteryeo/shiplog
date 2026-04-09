import { ConnectionProvider } from "@prisma/client";

import { fetchCompletedIssues } from "@/lib/linear/client";
import { prisma } from "@/lib/prisma";

type SyncInput = {
  userId: string;
  startDate: string;
  endDate: string;
};

export async function syncLinearFeatures({ userId, startDate, endDate }: SyncInput) {
  const connection = await prisma.connection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: ConnectionProvider.LINEAR,
      },
    },
  });

  if (!connection) {
    throw new Error("Linear connection not found");
  }

  const issues = await fetchCompletedIssues({
    accessToken: connection.accessToken,
    completedAtGte: new Date(startDate).toISOString(),
    completedAtLte: new Date(endDate).toISOString(),
  });

  await prisma.$transaction(
    issues.map((issue) =>
      prisma.feature.upsert({
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
          pulledAt: new Date(),
        },
        update: {
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
          description: issue.description,
          completedAt: new Date(issue.completedAt),
          prData: issue.pullRequests,
          pulledAt: new Date(),
        },
      }),
    ),
  );

  return { count: issues.length };
}
