import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ChatPane } from "@/components/ChatPane";
import type { Message, Profile, Project } from "@/lib/types";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single<Project>();

  if (!project) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const clientMessages = (messages ?? []).filter((m) => m.thread === "client");
  const mentorMessages = (messages ?? []).filter((m) => m.thread === "mentor");

  const needsSetup = !profile?.ai_provider || !profile.ai_model || !profile.api_key_encrypted;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{project.brief}</p>
        </div>

        {needsSetup && (
          <div className="mb-6 rounded-md border border-[var(--client-accent)] bg-[var(--client-accent-soft)] px-4 py-3 text-sm">
            You need to add an AI provider and API key before chatting.{" "}
            <Link href="/settings" className="underline">
              Go to Settings
            </Link>
            .
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <ChatPane
            projectId={project.id}
            thread="client"
            title={`💬 ${project.client_persona}`}
            subtitle="Your client"
            accent="client"
            initialMessages={clientMessages}
          />
          <ChatPane
            projectId={project.id}
            thread="mentor"
            title="🧑‍🎨 Senior Designer"
            subtitle="Your mentor"
            accent="mentor"
            initialMessages={mentorMessages}
          />
        </div>
      </main>
    </div>
  );
}
