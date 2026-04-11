import Link from "next/link";

const ERROR_HINTS: Record<string, string> = {
  Configuration:
    "Check NEXTAUTH_URL, NEXTAUTH_SECRET, and OAuth client IDs in .env.local, then restart the dev server.",
  AccessDenied: "You cancelled sign-in or the app was not granted access.",
  Verification: "The sign-in link is no longer valid. Try again from the app.",
  OAuthSignin: "Could not start OAuth with the provider. Verify provider credentials and callback URLs.",
  OAuthCallback:
    "OAuth returned an error during the callback. Enable NEXTAUTH_DEBUG=true in .env.local and watch the terminal, or confirm Postgres is running and prisma db push has been applied.",
  OAuthCreateAccount: "Could not create your account in the database. Check DATABASE_URL and run prisma db push.",
  Callback: "Callback route failed. See terminal logs with NEXTAUTH_DEBUG=true.",
  OAuthAccountNotLinked:
    "This account is already linked to another sign-in method. Use the original provider or contact support.",
  EmailSignin: "The email could not be sent.",
  CredentialsSignin: "Invalid credentials.",
  SessionRequired: "You must be signed in to view this page.",
};

type AuthErrorPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const code = searchParams.error ?? "Unknown";
  const hint = ERROR_HINTS[code] ?? "Something went wrong during sign-in.";

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-semibold text-stone-900">Sign-in problem</h1>
      <p className="mt-2 font-mono text-sm text-violet-800">{code}</p>
      <p className="mt-4 text-sm text-stone-600">{hint}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm text-stone-50"
        >
          Back to onboarding
        </Link>
        <Link href="/review" className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-800">
          Try review
        </Link>
      </div>
    </main>
  );
}
