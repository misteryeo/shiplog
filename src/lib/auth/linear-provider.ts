import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

type LinearProfile = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

export function LinearProvider(
  options: OAuthUserConfig<LinearProfile>,
): OAuthConfig<LinearProfile> {
  return {
    id: "linear",
    name: "Linear",
    type: "oauth",
    authorization: {
      url: "https://linear.app/oauth/authorize",
      params: {
        scope: "read",
      },
    },
    token: "https://api.linear.app/oauth/token",
    userinfo: {
      async request(context) {
        const response = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${context.tokens.access_token}`,
          },
          body: JSON.stringify({
            query: `
              query ViewerProfile {
                viewer {
                  id
                  name
                  email
                  avatarUrl
                }
              }
            `,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch Linear user profile");
        }

        const payload = await response.json();

        if (payload.errors?.length) {
          throw new Error(payload.errors[0].message ?? "Linear profile query failed");
        }

        return payload.data.viewer as LinearProfile;
      },
    },
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.avatarUrl,
      };
    },
    options,
  };
}
