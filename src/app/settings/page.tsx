import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { SettingsForm } from "@/components/SettingsForm";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Choose which AI provider powers your client and mentor chats, and bring your own API key.
        </p>
        <SettingsForm profile={profile} />
      </main>
    </div>
  );
}
