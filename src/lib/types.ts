export type Project = {
  id: string;
  user_id: string;
  title: string;
  archetype: string;
  brief: string;
  client_persona: string;
  industry: string | null;
  crit_notes: string | null;
  crit_notes_generated_at: string | null;
  difficulty: string;
  assignment_id: string | null;
  created_at: string;
};

export type Classroom = {
  id: string;
  owner_id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  classroom_id: string;
  title: string;
  archetype: string;
  difficulty: string;
  brief: string;
  client_persona: string;
  industry: string | null;
  created_at: string;
};

export type Thread = "client" | "mentor";

export type Message = {
  id: string;
  project_id: string;
  thread: Thread;
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  ai_provider: "anthropic" | "openai" | null;
  ai_model: string | null;
  api_key_encrypted: string | null;
  created_at: string;
};
