type LinearGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type LinearIssueNode = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string;
  completedAt: string;
  attachments?: {
    nodes?: Array<{
      id: string;
      title?: string | null;
      subtitle?: string | null;
      url?: string | null;
      sourceType?: string | null;
      metadata?: {
        title?: string;
        body?: string;
      } | null;
    }>;
  };
};

type IssuesQueryResponse = {
  issues: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
    nodes: LinearIssueNode[];
  };
};

export type NormalizedPullRequest = {
  title: string;
  body: string;
  url: string;
};

export type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string;
  url: string;
  completedAt: string;
  pullRequests: NormalizedPullRequest[];
};

const issuesQuery = `
  query ShippedIssues($first: Int!, $after: String, $completedAtGte: DateTimeOrDuration!, $completedAtLte: DateTimeOrDuration!) {
    issues(
      first: $first
      after: $after
      filter: {
        state: { type: { eq: "completed" } }
        completedAt: { gte: $completedAtGte, lte: $completedAtLte }
      }
      orderBy: updatedAt
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        description
        url
        completedAt
        attachments {
          nodes {
            id
            title
            subtitle
            url
            sourceType
            metadata
          }
        }
      }
    }
  }
`;

async function linearGraphQL<T>(token: string, query: string, variables: Record<string, unknown>) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(`Linear request failed: ${response.status} - ${rawBody}`);
  }

  const payload = JSON.parse(rawBody) as LinearGraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message ?? "Linear query failed");
  }

  if (!payload.data) {
    throw new Error("Linear query returned no data");
  }

  return payload.data;
}

function normalizePullRequests(issue: LinearIssueNode): NormalizedPullRequest[] {
  const attachments = issue.attachments?.nodes ?? [];

  return attachments
    .filter((attachment) => {
      const source = (attachment.sourceType ?? "").toLowerCase();
      const url = attachment.url ?? "";
      return source.includes("github") || url.includes("github.com");
    })
    .map((attachment) => ({
      title: attachment.metadata?.title ?? attachment.title ?? "Linked pull request",
      body: attachment.metadata?.body ?? attachment.subtitle ?? "",
      url: attachment.url ?? "",
    }));
}

export async function fetchCompletedIssues(params: {
  accessToken: string;
  completedAtGte: string;
  completedAtLte: string;
}) {
  const allIssues: LinearIssue[] = [];
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const data: IssuesQueryResponse = await linearGraphQL<IssuesQueryResponse>(
      params.accessToken,
      issuesQuery,
      {
        first: 50,
        after,
        completedAtGte: params.completedAtGte,
        completedAtLte: params.completedAtLte,
      },
    );

    const nodes = data.issues.nodes ?? [];
    nodes.forEach((node) => {
      allIssues.push({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        description: node.description ?? "",
        url: node.url,
        completedAt: node.completedAt,
        pullRequests: normalizePullRequests(node),
      });
    });

    hasNextPage = data.issues.pageInfo.hasNextPage;
    after = data.issues.pageInfo.endCursor ?? null;
  }

  return allIssues;
}
