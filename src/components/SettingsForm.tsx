"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/app/settings/actions";
import type { Profile } from "@/lib/types";

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o",
};

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const [provider, setProvider] = useState<"anthropic" | "openai">(profile?.ai_provider ?? "anthropic");
  const [model, setModel] = useState(profile?.ai_model ?? DEFAULT_MODELS.anthropic);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleProviderChange(next: "anthropic" | "openai") {
    setProvider(next);
    setModel(DEFAULT_MODELS[next]);
  }

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await saveSettings(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex max-w-md flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">AI provider</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="provider"
              value="anthropic"
              checked={provider === "anthropic"}
              onChange={() => handleProviderChange("anthropic")}
            />
            Anthropic (Claude)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="provider"
              value="openai"
              checked={provider === "openai"}
              onChange={() => handleProviderChange("openai")}
            />
            OpenAI (ChatGPT)
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Model name
        <input
          type="text"
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        />
        <span className="text-xs text-[var(--muted)]">
          The exact model id from your provider, e.g. claude-sonnet-5 or gpt-4o.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        API key
        <input
          type="password"
          name="apiKey"
          placeholder={profile?.api_key_encrypted ? "•••••••• (saved — leave blank to keep it)" : "sk-…"}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        />
        <span className="text-xs text-[var(--muted)]">
          Stored encrypted. Get one from{" "}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" className="underline">
            console.anthropic.com
          </a>{" "}
          or{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">
            platform.openai.com
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-[var(--brand-foreground)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save settings"}
      </button>
      {saved && <p className="text-sm text-[var(--mentor-accent)]">Saved.</p>}
    </form>
  );
}
