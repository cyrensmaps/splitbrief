import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold">SplitBrief</h1>
      <p className="text-[var(--muted)]">
        Practice real client conversations, with a senior designer mentor in the next window over.
        Training only — no real clients, no generated deliverables.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-md bg-[var(--brand)] px-5 py-2 text-[var(--brand-foreground)]">
          Get started
        </Link>
        <Link href="/login" className="rounded-md border border-[var(--border)] px-5 py-2">
          Log in
        </Link>
      </div>
    </main>
  );
}
