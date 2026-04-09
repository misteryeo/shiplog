import { prisma } from "@/lib/prisma";

export async function getFeaturesForRange(userId: string, startDate: string, endDate: string) {
  return prisma.feature.findMany({
    where: {
      userId,
      completedAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: {
      completedAt: "desc",
    },
  });
}

export async function getFeaturesByIds(userId: string, ids: string[]) {
  return prisma.feature.findMany({
    where: {
      userId,
      id: {
        in: ids,
      },
    },
    orderBy: {
      completedAt: "desc",
    },
  });
}
