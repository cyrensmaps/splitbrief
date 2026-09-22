import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import type { Assignment, Classroom, Project } from "@/lib/types";

type MemberRow = { user_id: string; joined_at: string };
type SubmissionRow = Pick<Project, "id" | "user_id" | "assignment_id" | "created_at">;

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .single<Classroom>();

  if (!classroom) notFound();

  const { data: members } = await supabase
    .from("classroom_members")
    .select("user_id, joined_at")
    .eq("classroom_id", id)
    .returns<MemberRow[]>();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("classroom_id", id)
    .order("created_at", { ascending: false })
    .returns<Assignment[]>();

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: submissions } = assignmentIds.length
    ? await supabase
        .from("projects")
        .select("id, user_id, assignment_id, created_at")
        .in("assignment_id", assignmentIds)
        .returns<SubmissionRow[]>()
    : { data: [] as SubmissionRow[] };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{classroom.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Invite code: <span className="font-mono font-medium">{classroom.invite_code}</span> — share this with
          students so they can join.
        </p>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-medium">Assignments</h2>
          <Link
            href={`/classroom/${id}/assignments/new`}
            className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-[var(--brand-foreground)]"
          >
            + New assignment
          </Link>
        </div>

        {assignments && assignments.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-4">
            {assignments.map((a) => {
              const subs = (submissions ?? []).filter((s) => s.assignment_id === a.id);
              return (
                <li key={a.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <h3 className="font-medium">{a.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{a.brief}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {subs.length} of {members?.length ?? 0} student{members?.length === 1 ? "" : "s"} started
                  </p>
                  {subs.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {subs.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/classroom/${id}/submissions/${s.id}`}
                            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:border-[var(--brand)]"
                          >
                            View submission
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">No assignments yet.</p>
        )}

        <div className="mt-8">
          <h2 className="font-medium">Roster ({members?.length ?? 0})</h2>
          {members && members.length > 0 ? (
            <ul className="mt-2 text-sm text-[var(--muted)]">
              {members.map((m) => (
                <li key={m.user_id}>Joined {new Date(m.joined_at).toLocaleDateString()}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No students have joined yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
