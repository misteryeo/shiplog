import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { GenerateClient } from "@/components/generate-client";
import { authOptions } from "@/lib/auth";

type GeneratePageProps = {
  searchParams: {
    ids?: string;
  };
};

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  const ids = searchParams.ids ?? "";
  const selectedCount = ids ? ids.split(",").filter(Boolean).length : 0;

  return (
    <main className="mx-auto max-w-6xl px-4">
      <GenerateClient selectedCount={selectedCount} idsParam={ids} />
    </main>
  );
}
