import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ProjectCard } from "@/components/ProjectCard";
import { startAssignment } from "@/app/classroom/actions";
import type { Assignment, Project } from "@/lib/types";

type AssignmentWithClassroom = Assignment & { classrooms: { name: string } | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<Project[]>();

  const { data: memberships } = await supabase
    .from("classroom_members")
    .select("classroom_id")
    .eq("user_id", user!.id)
    .returns<{ classroom_id: string }[]>();

  const classroomIds = (memberships ?? []).map((m) => m.classroom_id);

  const { data: assignments } = classroomIds.length
    ? await supabase
        .from("assignments")
        .select("*, classrooms(name)")
        .in("classroom_id", classroomIds)
        .order("created_at", { ascending: false })
        .returns<AssignmentWithClassroom[]>()
    : { data: [] as AssignmentWithClassroom[] };

  const projectByAssignment = new Map(
    (projects ?? [])
      .filter((p) => p.assignment_id !== null)
      .map((p) => [p.assignment_id as string, p.id])
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {assignments && assignments.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-lg font-medium">Assigned to you</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {assignments.map((a) => {
                const existingProjectId = projectByAssignment.get(a.id);
                return (
                  <li key={a.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                    <p className="text-xs text-[var(--muted)]">{a.classrooms?.name}</p>
                    <h3 className="font-medium">{a.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{a.brief}</p>
                    {existingProjectId ? (
                      <Link
                        href={`/projects/${existingProjectId}`}
                        className="mt-3 inline-block text-sm text-[var(--brand)] underline"
                      >
                        Continue
                      </Link>
                    ) : (
                      <form action={startAssignment.bind(null, a.id)} className="mt-3">
                        <button
                          type="submit"
                          className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-[var(--brand-foreground)]"
                        >
                          Start assignment
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your projects</h1>
          <Link
            href="/projects/new"
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-[var(--brand-foreground)]"
          >
            + New project
          </Link>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
            <p>No projects yet. Start one to get a client brief and begin practicing.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
