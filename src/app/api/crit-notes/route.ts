import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto";
import { getChatReply } from "@/lib/ai/provider";
import { ARCHETYPES, critNotesSystemPrompt } from "@/lib/ai/personas";
import { formatTranscript } from "@/lib/ai/transcript";
import type { Message, Profile, Project } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId } = body as { projectId: string };

  if (!projectId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single<Project>();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile?.ai_provider || !profile.ai_model || !profile.api_key_encrypted) {
    return NextResponse.json(
      { error: "Set up your AI provider and API key in Settings first." },
      { status: 400 }
    );
  }

  const archetype = ARCHETYPES.find((a) => a.id === project.archetype);
  if (!archetype) {
    return NextResponse.json({ error: "Unknown client archetype" }, { status: 500 });
  }

  const { data: allRows } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const clientRows = (allRows ?? []).filter((r) => r.thread === "client");
  const mentorRows = (allRows ?? []).filter((r) => r.thread === "mentor");

  if (clientRows.length === 0 && mentorRows.length === 0) {
    return NextResponse.json({ error: "There's no conversation yet to summarize." }, { status: 400 });
  }

  const transcript =
    `=== Conversation with the client ===\n${clientRows.length ? formatTranscript(clientRows, "Client") : "(no messages yet)"}\n\n` +
    `=== Conversation with the mentor ===\n${mentorRows.length ? formatTranscript(mentorRows, "Mentor") : "(no messages yet)"}`;

  const apiKey = decryptApiKey(profile.api_key_encrypted);

  try {
    const notes = await getChatReply({
      provider: profile.ai_provider,
      apiKey,
      model: profile.ai_model,
      systemPrompt: critNotesSystemPrompt({ brief: project.brief, archetype }),
      history: [{ role: "user", text: transcript }],
    });

    const generatedAt = new Date().toISOString();
    await supabase
      .from("projects")
      .update({ crit_notes: notes, crit_notes_generated_at: generatedAt })
      .eq("id", projectId);

    return NextResponse.json({ notes, generatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The AI provider request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
