import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your SplitBrief account</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Already have one?{" "}
          <Link href="/login" className="text-[var(--brand)] underline">
            Log in
          </Link>
        </p>
      </div>
      <AuthForm mode="signup" />
    </main>
  );
}
