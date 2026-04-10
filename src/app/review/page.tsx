import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ReviewClient } from "@/components/review-client";
import { authOptions } from "@/lib/auth";
import { getDefaultDateRange } from "@/lib/cadence";
import { getFeaturesForRange } from "@/lib/features";
import { prisma } from "@/lib/prisma";

type ReviewPageProps = {
  searchParams: {
    start?: string;
    end?: string;
  };
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  const [user, linearConnection, notionConnection] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.connection.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: ConnectionProvider.LINEAR,
        },
      },
    }),
    prisma.connection.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: ConnectionProvider.NOTION,
        },
      },
    }),
  ]);

  if (!linearConnection) {
    redirect("/onboarding");
  }

  const defaults = getDefaultDateRange(user?.cadence ?? "WEEKLY");
  const startDate = searchParams.start ?? defaults.start;
  const endDate = searchParams.end ?? defaults.end;
  const features = await getFeaturesForRange(session.user.id, startDate, endDate);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <ReviewClient
        initialFeatures={features}
        initialStartDate={startDate}
        initialEndDate={endDate}
        notionConnected={Boolean(notionConnection)}
      />
    </main>
  );
}
