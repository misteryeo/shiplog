import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.connection.deleteMany({
    where: {
      userId: session.user.id,
      provider: ConnectionProvider.LINEAR,
    },
  });

  return NextResponse.json({ ok: true });
}
