import { ConnectionProvider } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  const linearConnection = await prisma.connection.findUnique({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: ConnectionProvider.LINEAR,
      },
    },
  });

  if (!linearConnection) {
    redirect("/onboarding");
  }

  redirect("/review");
}
