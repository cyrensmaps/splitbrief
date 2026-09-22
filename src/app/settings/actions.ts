"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encryptApiKey } from "@/lib/crypto";

export async function saveSettings(formData: FormData) {
  const provider = formData.get("provider") as string;
  const model = formData.get("model") as string;
  const apiKey = (formData.get("apiKey") as string) || "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const update: Record<string, string> = { ai_provider: provider, ai_model: model };
  if (apiKey.trim().length > 0) {
    update.api_key_encrypted = encryptApiKey(apiKey.trim());
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
