"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/classroom";
import { ARCHETYPES, generateBrief } from "@/lib/ai/personas";

export async function createClassroom(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Classroom name is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let classroomId: string | null = null;
  for (let attempt = 0; attempt < 5 && !classroomId; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from("classrooms")
      .insert({ owner_id: user.id, name, invite_code: inviteCode })
      .select("id")
      .single();

    if (data) {
      classroomId = data.id;
    } else if (!error?.message.includes("duplicate")) {
      throw new Error(error?.message ?? "Failed to create classroom");
    }
  }
  if (!classroomId) throw new Error("Failed to create classroom, please try again");

  redirect(`/classroom/${classroomId}`);
}

export async function joinClassroom(formData: FormData) {
  const code = (formData.get("code") as string)?.trim();
  if (!code) throw new Error("Invite code is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("join_classroom", { code });
  if (error) throw new Error("Invalid invite code");

  redirect("/dashboard");
}

export async function generateAssignmentBriefPreview(archetypeId: string, projectTypeId?: string) {
  const archetype = ARCHETYPES.find((a) => a.id === archetypeId);
  if (!archetype) throw new Error("Unknown archetype");

  const brief = generateBrief({ projectTypeId });
  return { archetypeId: archetype.id, ...brief };
}

export async function createAssignment(payload: {
  classroomId: string;
  title: string;
  archetypeId: string;
  difficultyId: string;
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

  const { error } = await supabase.from("assignments").insert({
    classroom_id: payload.classroomId,
    title: payload.title,
    archetype: archetype.id,
    difficulty: payload.difficultyId,
    brief: payload.brief,
    client_persona: payload.clientName,
    industry: payload.industry,
  });
  if (error) throw new Error(error.message);

  redirect(`/classroom/${payload.classroomId}`);
}

export async function startAssignment(assignmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProject) {
    redirect(`/projects/${existingProject.id}`);
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();
  if (!assignment) throw new Error("Assignment not found");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: assignment.title,
      archetype: assignment.archetype,
      brief: assignment.brief,
      client_persona: assignment.client_persona,
      industry: assignment.industry,
      difficulty: assignment.difficulty,
      assignment_id: assignment.id,
    })
    .select("id")
    .single();
  if (error || !project) throw new Error(error?.message ?? "Failed to start assignment");

  redirect(`/projects/${project.id}`);
}
