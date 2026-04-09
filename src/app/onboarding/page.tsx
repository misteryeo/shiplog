import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { OnboardingClient } from "@/components/onboarding-client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-3xl px-4">
        <OnboardingClient linearConnected={false} currentCadence="WEEKLY" />
      </main>
    );
  }

  const [user, linearConnection] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.connection.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: ConnectionProvider.LINEAR,
        },
      },
    }),
  ]);

  if (user?.onboardingComplete && linearConnection) {
    redirect("/review");
  }

  return (
    <main className="mx-auto max-w-3xl px-4">
      <OnboardingClient
        linearConnected={Boolean(linearConnection)}
        currentCadence={user?.cadence ?? "WEEKLY"}
      />
    </main>
  );
}
