import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { ConnectionProvider } from "@prisma/client";
import { getServerSession } from "next-auth";

import { AppHeader } from "@/components/app-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ShipLog",
  description: "Turn shipped work into clear product storytelling.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          connections: true,
        },
      })
    : null;
  const linearConnected = Boolean(
    user?.connections.find((connection) => connection.provider === ConnectionProvider.LINEAR),
  );
  const notionConnected = Boolean(
    user?.connections.find((connection) => connection.provider === ConnectionProvider.NOTION),
  );

  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable} min-h-screen bg-stone-50 font-sans text-stone-950 antialiased`}
      >
        <AppHeader
          showSettings={Boolean(session?.user?.id)}
          cadence={user?.cadence}
          linearConnected={linearConnected}
          notionConnected={notionConnected}
        />
        {children}
      </body>
    </html>
  );
}
