"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ARCHETYPES, generateBrief } from "@/lib/ai/personas";

export async function createProject(formData: FormData) {
  const archetypeId = formData.get("archetypeId") as string;
  const archetype = ARCHETYPES.find((a) => a.id === archetypeId);
  if (!archetype) throw new Error("Unknown archetype");

  const { title, brief, clientName } = generateBrief();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title,
      archetype: archetype.id,
      brief,
      client_persona: clientName,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create project");

  redirect(`/projects/${data.id}`);
}
