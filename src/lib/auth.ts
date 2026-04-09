import { PrismaAdapter } from "@auth/prisma-adapter";
import { ConnectionProvider } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";

import { LinearProvider } from "@/lib/auth/linear-provider";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/onboarding",
  },
  providers: [
    LinearProvider({
      clientId: process.env.LINEAR_CLIENT_ID ?? "",
      clientSecret: process.env.LINEAR_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account, user }) {
      if (!account || account.provider !== "linear") {
        return true;
      }

      await prisma.connection.upsert({
        where: {
          userId_provider: {
            userId: user.id,
            provider: ConnectionProvider.LINEAR,
          },
        },
        create: {
          userId: user.id,
          provider: ConnectionProvider.LINEAR,
          accessToken: account.access_token ?? "",
          refreshToken: account.refresh_token ?? null,
          scope: account.scope ?? "read",
          expiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
        },
        update: {
          accessToken: account.access_token ?? "",
          refreshToken: account.refresh_token ?? null,
          scope: account.scope ?? "read",
          expiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
        },
      });

      return true;
    },
  },
};

const authHandler = NextAuth(authOptions);

export { authHandler };
