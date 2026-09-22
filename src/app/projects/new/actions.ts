"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ARCHETYPES, generateBrief } from "@/lib/ai/personas";
import type { Project } from "@/lib/types";

export async function generateBriefPreview(archetypeId: string, projectTypeId?: string) {
  const archetype = ARCHETYPES.find((a) => a.id === archetypeId);
  if (!archetype) throw new Error("Unknown archetype");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("projects")
    .select("industry")
    .eq("user_id", user.id)
    .returns<Pick<Project, "industry">[]>();

  const usedIndustries = (existing ?? [])
    .map((p) => p.industry)
    .filter((industry): industry is string => Boolean(industry));

  const brief = generateBrief({ excludeIndustries: usedIndustries, projectTypeId });
  return { archetypeId: archetype.id, ...brief };
}

export async function createProject(payload: {
  archetypeId: string;
  title: string;
  brief: string;
  clientName: string;
  industry: string;
}) {
  const archetype = ARCHETYPES.find((a) => a.id === payload.archetypeId);
  if (!archetype) throw new Error("Unknown archetype");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: payload.title,
      archetype: archetype.id,
      brief: payload.brief,
      client_persona: payload.clientName,
      industry: payload.industry,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create project");

  redirect(`/projects/${data.id}`);
}
