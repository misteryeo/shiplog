import { Cadence } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const cadenceSchema = z.object({
  cadence: z.nativeEnum(Cadence),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = cadenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      cadence: parsed.data.cadence,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ ok: true });
}
