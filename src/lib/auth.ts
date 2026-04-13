import { PrismaAdapter } from "@auth/prisma-adapter";
import { ConnectionProvider } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";

import { LinearProvider } from "@/lib/auth/linear-provider";
import { NotionProvider } from "@/lib/auth/notion-provider";
import { prisma } from "@/lib/prisma";

const DEFAULT_ACCOUNT_FIELDS = new Set([
  "provider",
  "type",
  "providerAccountId",
  "refresh_token",
  "access_token",
  "expires_at",
  "token_type",
  "scope",
  "id_token",
  "session_state",
]);

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
    async signIn({ account }) {
      // Notion returns many non-standard token fields.
      // Prisma Account schema follows NextAuth defaults, so strip unknown fields
      // before adapter.linkAccount persists this object.
      if (account?.provider === "notion") {
        const mutableAccount = account as Record<string, unknown>;
        Object.keys(mutableAccount).forEach((key) => {
          if (!DEFAULT_ACCOUNT_FIELDS.has(key)) {
            delete mutableAccount[key];
          }
        });
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    // Run after the adapter has persisted User + Account (avoids Connection_userId_fkey on first sign-in).
    async signIn({ user, account }) {
      if (!account?.provider || !account.providerAccountId) {
        return;
      }

      const provider =
        account.provider === "linear"
          ? ConnectionProvider.LINEAR
          : account.provider === "notion"
            ? ConnectionProvider.NOTION
            : null;

      if (!provider) {
        return;
      }

      try {
        const persistedAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: {
            userId: true,
          },
        });

        const resolvedUserId = persistedAccount?.userId ?? user?.id;
        if (!resolvedUserId) {
          console.error(
            "[NextAuth] Could not resolve userId for OAuth token persistence.",
            { provider: account.provider, providerAccountId: account.providerAccountId },
          );
          return;
        }

        await prisma.connection.upsert({
          where: {
            userId_provider: {
              userId: resolvedUserId,
              provider,
            },
          },
          create: {
            userId: resolvedUserId,
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
        // Do not rethrow: NextAuth may put the message on a redirect URL and break Headers (newlines).
        console.error(
          "[NextAuth] Failed to persist OAuth tokens to Connection (user may need to sign in again):",
          error,
        );
      }
    },
  },
};

const authHandler = NextAuth(authOptions);

export { authHandler };
