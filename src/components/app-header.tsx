import Link from "next/link";
import type { Cadence } from "@prisma/client";

import { SettingsPanel } from "@/components/settings-panel";

type AppHeaderProps = {
  showSettings: boolean;
  cadence?: Cadence;
  linearConnected?: boolean;
  notionConnected?: boolean;
};

export function AppHeader({
  showSettings,
  cadence,
  linearConnected,
  notionConnected,
}: AppHeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-stone-50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/review" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-semibold text-white">
            S
          </div>
          <span className="text-lg font-medium text-stone-900">ShipLog</span>
        </Link>

        {showSettings &&
        cadence &&
        typeof linearConnected === "boolean" &&
        typeof notionConnected === "boolean" ? (
          <SettingsPanel
            cadence={cadence}
            linearConnected={linearConnected}
            notionConnected={notionConnected}
          />
        ) : null}
      </div>
    </header>
  );
}
