import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Log in to SplitBrief</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          No account yet?{" "}
          <Link href="/signup" className="text-[var(--brand)] underline">
            Sign up
          </Link>
        </p>
      </div>
      <AuthForm mode="login" />
    </main>
  );
}
