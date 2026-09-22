import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto";
import { getChatReply, type ChatMessage } from "@/lib/ai/provider";
import { ARCHETYPES, clientSystemPrompt, mentorSystemPrompt } from "@/lib/ai/personas";
import type { Message, Profile, Project, Thread } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId, thread, text, imagePath, imageMediaType } = body as {
    projectId: string;
    thread: Thread;
    text: string;
    imagePath?: string;
    imageMediaType?: string;
  };

  if (!projectId || (thread !== "client" && thread !== "mentor")) {
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

  const { error: insertUserError } = await supabase.from("messages").insert({
    project_id: projectId,
    thread,
    role: "user",
    content: text ?? "",
    image_url: imagePath ?? null,
  });
  if (insertUserError) {
    return NextResponse.json({ error: insertUserError.message }, { status: 500 });
  }

  const { data: rows, error: historyError } = await supabase
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .eq("thread", thread)
    .order("created_at", { ascending: true })
    .returns<Message[]>();
  if (historyError || !rows) {
    return NextResponse.json({ error: historyError?.message ?? "Failed to load history" }, { status: 500 });
  }

  let currentImage: ChatMessage["image"] | undefined;
  if (imagePath) {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("project-images")
      .download(imagePath);
    if (downloadError || !fileBlob) {
      return NextResponse.json({ error: "Could not read uploaded image" }, { status: 500 });
    }
    const arrayBuffer = await fileBlob.arrayBuffer();
    currentImage = {
      base64: Buffer.from(arrayBuffer).toString("base64"),
      mediaType: imageMediaType || "image/png",
    };
  }

  const latestRow = rows[rows.length - 1];
  const history: ChatMessage[] = rows.map((row) => {
    const isLatest = row.id === latestRow.id;
    const noteAboutImage = row.image_url && !isLatest ? " [shared an image with this message]" : "";
    return {
      role: row.role,
      text: `${row.content}${noteAboutImage}`.trim() || "(sent an image)",
      image: isLatest ? currentImage : undefined,
    };
  });

  let clientTranscript: string | undefined;
  if (thread === "mentor") {
    const { data: clientRows } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", projectId)
      .eq("thread", "client")
      .order("created_at", { ascending: true })
      .returns<Message[]>();

    if (clientRows && clientRows.length > 0) {
      clientTranscript = clientRows
        .map((row) => {
          const speaker = row.role === "user" ? "Designer" : "Client";
          const imageNote = row.image_url ? " [shared an image]" : "";
          return `${speaker}: ${row.content}${imageNote}`;
        })
        .join("\n");
    }
  }

  const systemPrompt =
    thread === "client"
      ? clientSystemPrompt({ clientName: project.client_persona, brief: project.brief, archetype })
      : mentorSystemPrompt({ brief: project.brief, archetype, clientTranscript });

  const apiKey = decryptApiKey(profile.api_key_encrypted);

  try {
    const reply = await getChatReply({
      provider: profile.ai_provider,
      apiKey,
      model: profile.ai_model,
      systemPrompt,
      history,
    });

    await supabase.from("messages").insert({
      project_id: projectId,
      thread,
      role: "assistant",
      content: reply,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The AI provider request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
