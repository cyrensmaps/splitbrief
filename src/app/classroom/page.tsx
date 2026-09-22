import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { createClassroom, joinClassroom } from "./actions";
import type { Classroom } from "@/lib/types";

type MembershipRow = { classroom_id: string; classrooms: Classroom | null };

export default async function ClassroomHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owned } = await supabase
    .from("classrooms")
    .select("*")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<Classroom[]>();

  const { data: memberships } = await supabase
    .from("classroom_members")
    .select("classroom_id, classrooms(*)")
    .eq("user_id", user!.id)
    .returns<MembershipRow[]>();

  const joined = (memberships ?? [])
    .map((m) => m.classrooms)
    .filter((c): c is Classroom => c !== null && !(owned ?? []).some((o) => o.id === c.id));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Classrooms</h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Create a classroom to assign the same brief to a group of students, or join one with an invite code.
        </p>

        <div className="grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 font-medium">Your classrooms (instructor)</h2>
            {owned && owned.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {owned.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/classroom/${c.id}`}
                      className="block rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm hover:border-[var(--brand)]"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-[var(--muted)]">You don&apos;t run any classrooms yet.</p>
            )}
            <form action={createClassroom} className="mt-4 flex gap-2">
              <input
                name="name"
                placeholder="Classroom name"
                required
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-[var(--brand-foreground)]"
              >
                Create
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Classrooms you&apos;ve joined</h2>
            {joined.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {joined.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-[var(--muted)]">You haven&apos;t joined a classroom yet.</p>
            )}
            <form action={joinClassroom} className="mt-4 flex gap-2">
              <input
                name="code"
                placeholder="Invite code"
                required
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm uppercase"
              />
              <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                Join
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
