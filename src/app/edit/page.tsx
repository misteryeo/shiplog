import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { EditClient } from "@/components/edit-client";
import { authOptions } from "@/lib/auth";
import { getFeaturesByIds } from "@/lib/features";
import type { DraftMode, Tone } from "@/lib/posts/templates";

type EditPageProps = {
  searchParams: {
    ids?: string;
    mode?: DraftMode;
    tone?: Tone;
  };
};

function normalizeMode(mode: string | undefined): DraftMode {
  if (mode === "individual") return "individual";
  return "batch";
}

function normalizeTone(tone: string | undefined): Tone {
  if (tone === "announcer" || tone === "teacher") return tone;
  return "storyteller";
}

export default async function EditPage({ searchParams }: EditPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  const ids = searchParams.ids?.split(",").filter(Boolean) ?? [];
  const features = ids.length ? await getFeaturesByIds(session.user.id, ids) : [];
  const mode = normalizeMode(searchParams.mode);
  const tone = normalizeTone(searchParams.tone);

  return (
    <main className="mx-auto max-w-6xl px-4">
      <EditClient features={features} mode={mode} tone={tone} />
    </main>
  );
}
