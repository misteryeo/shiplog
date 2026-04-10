import { PrismaAdapter } from "@auth/prisma-adapter";
import { ConnectionProvider } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";

import { LinearProvider } from "@/lib/auth/linear-provider";
import { NotionProvider } from "@/lib/auth/notion-provider";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  logger: {
    error(code, metadata) {
      console.error("[NextAuth]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth]", code);
    },
    debug(code, metadata) {
      if (process.env.NEXTAUTH_DEBUG === "true") {
        console.log("[NextAuth]", code, metadata);
      }
    },
  },
  pages: {
    signIn: "/onboarding",
    error: "/auth/error",
  },
  providers: [
    LinearProvider({
      clientId: process.env.LINEAR_CLIENT_ID ?? "",
      clientSecret: process.env.LINEAR_CLIENT_SECRET ?? "",
    }),
    NotionProvider({
      clientId: process.env.NOTION_CLIENT_ID ?? "",
      clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
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
      if (!account) {
        return true;
      }

      const provider =
        account.provider === "linear"
          ? ConnectionProvider.LINEAR
          : account.provider === "notion"
            ? ConnectionProvider.NOTION
            : null;

      if (!provider) {
        return true;
      }

      try {
        await prisma.connection.upsert({
          where: {
            userId_provider: {
              userId: user.id,
              provider,
            },
          },
          create: {
            userId: user.id,
            provider,
            accessToken: account.access_token ?? "",
            refreshToken: account.refresh_token ?? null,
            scope: account.scope ?? undefined,
            expiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
          update: {
            accessToken: account.access_token ?? "",
            refreshToken: account.refresh_token ?? null,
            scope: account.scope ?? undefined,
            expiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
        });
      } catch (error) {
        console.error(
          "[NextAuth] Failed to persist OAuth connection (check DATABASE_URL and prisma db push):",
          error,
        );
        throw error;
      }

      return true;
    },
  },
};

const authHandler = NextAuth(authOptions);

export { authHandler };
