import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { GenerateClient } from "@/components/generate-client";
import { authOptions } from "@/lib/auth";
import type { DraftMode, Tone } from "@/lib/posts/templates";

type GeneratePageProps = {
  searchParams: {
    ids?: string;
    start?: string;
    end?: string;
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

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  const ids = searchParams.ids ?? "";
  const selectedCount = ids ? ids.split(",").filter(Boolean).length : 0;
  const startDate = searchParams.start ?? null;
  const endDate = searchParams.end ?? null;
  const initialMode = normalizeMode(searchParams.mode);
  const initialTone = normalizeTone(searchParams.tone);

  return (
    <main className="mx-auto max-w-6xl px-4">
      <GenerateClient
        selectedCount={selectedCount}
        idsParam={ids}
        initialMode={initialMode}
        initialTone={initialTone}
        startDate={startDate}
        endDate={endDate}
      />
    </main>
  );
}
