import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

type NotionProfile = {
  id: string;
  name?: string;
  avatar_url?: string | null;
};

export function NotionProvider(
  options: OAuthUserConfig<NotionProfile>,
): OAuthConfig<NotionProfile> {
  return {
    id: "notion",
    name: "Notion",
    type: "oauth",
    authorization: {
      url: "https://api.notion.com/v1/oauth/authorize",
      params: {
        owner: "user",
      },
    },
    token: "https://api.notion.com/v1/oauth/token",
    userinfo: {
      async request(context) {
        const response = await fetch("https://api.notion.com/v1/users/me", {
          headers: {
            Authorization: `Bearer ${context.tokens.access_token}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch Notion user profile");
        }

        const payload = (await response.json()) as {
          id: string;
          name?: string;
          avatar_url?: string | null;
        };

        return {
          id: payload.id,
          name: payload.name,
          avatar_url: payload.avatar_url,
        };
      },
    },
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name ?? "Notion User",
        email: undefined,
        image: profile.avatar_url ?? undefined,
      };
    },
    checks: ["state"],
    options,
  };
}
