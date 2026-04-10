import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { fetchNotionPageExcerpt } from "@/lib/notion/client";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  pageId: z.string().min(1),
  pageTitle: z.string().min(1),
  pageUrl: z.string().url(),
  confidence: z.enum(["high", "low"]).optional(),
});

type Context = {
  params: {
    featureId: string;
  };
};

export async function POST(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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

  const feature = await prisma.feature.findFirst({
    where: {
      id: context.params.featureId,
      userId: session.user.id,
    },
  });

  if (!feature) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  const excerpt = await fetchNotionPageExcerpt({
    accessToken: notionConnection.accessToken,
    pageId: parsed.data.pageId,
    maxChars: 500,
  });

  await prisma.feature.update({
    where: { id: feature.id },
    data: {
      notionPageId: parsed.data.pageId,
      notionPageTitle: parsed.data.pageTitle,
      notionPageUrl: parsed.data.pageUrl,
      notionMatchConfidence: parsed.data.confidence ?? "low",
      notionExcerpt: excerpt,
    },
  });

  return NextResponse.json({ ok: true });
}
