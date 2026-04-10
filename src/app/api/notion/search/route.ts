import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { searchNotionPages } from "@/lib/notion/client";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  query: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const notionConnection = await prisma.connection.findUnique({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider: ConnectionProvider.NOTION,
      },
    },
  });

  if (!notionConnection) {
    return NextResponse.json({ error: "Notion is not connected" }, { status: 400 });
  }

  const results = await searchNotionPages({
    accessToken: notionConnection.accessToken,
    query: parsed.data.query,
    limit: 8,
  });

  return NextResponse.json({ results });
}
