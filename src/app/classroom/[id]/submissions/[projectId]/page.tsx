import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ReadOnlyTranscript } from "@/components/ReadOnlyTranscript";
import type { Classroom, Message, Project } from "@/lib/types";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;
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

  // RLS also enforces that this project belongs to one of this classroom's assignments.
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single<Project>();
  if (!project || project.assignment_id === null) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const clientMessages = (messages ?? []).filter((m) => m.thread === "client");
  const mentorMessages = (messages ?? []).filter((m) => m.thread === "mentor");

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Read-only submission view · {classroom.name}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ReadOnlyTranscript title={project.client_persona} subtitle="Client conversation" messages={clientMessages} />
          <ReadOnlyTranscript title="Senior Designer" subtitle="Mentor conversation" messages={mentorMessages} />
        </div>

        {project.crit_notes && (
          <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Crit notes</h2>
            <div className="prose prose-sm mt-3 max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.crit_notes}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
