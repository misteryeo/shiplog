import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  provider: z.enum(["LINEAR", "NOTION"]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const provider =
    parsed.data.provider === "LINEAR"
      ? ConnectionProvider.LINEAR
      : ConnectionProvider.NOTION;

  await prisma.connection.deleteMany({
    where: {
      userId: session.user.id,
      provider,
    },
  });

  return NextResponse.json({ ok: true });
}
