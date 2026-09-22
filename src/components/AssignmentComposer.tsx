"use client";

import { useState, useTransition } from "react";
import { generateAssignmentBriefPreview, createAssignment } from "@/app/classroom/actions";
import { ARCHETYPES, DIFFICULTIES, PROJECT_TYPE_PACKS, type Archetype } from "@/lib/ai/personas";

type Preview = {
  archetypeId: string;
  title: string;
  brief: string;
  clientName: string;
  industry: string;
  projectTypeId: string;
};

export function AssignmentComposer({ classroomId }: { classroomId: string }) {
  const [selected, setSelected] = useState<Archetype | null>(null);
  const [projectTypeId, setProjectTypeId] = useState<string>("");
  const [difficultyId, setDifficultyId] = useState<string>("standard");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generateFor(archetype: Archetype, typeId: string) {
    setSelected(archetype);
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateAssignmentBriefPreview(archetype.id, typeId || undefined);
        setPreview(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate a brief");
      }
    });
  }

  function generateForRandomArchetype() {
    const randomArchetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    generateFor(randomArchetype, projectTypeId);
  }

  function handleCreate() {
    if (!preview) return;
    startTransition(async () => {
      try {
        await createAssignment({ classroomId, difficultyId, ...preview });
      } catch (err) {
        const digest = (err as { digest?: string } | null)?.digest;
        if (!digest?.startsWith("NEXT_REDIRECT")) {
          setError(err instanceof Error ? err.message : "Failed to create assignment");
        }
      }
    });
  }

  if (selected) {
    return (
      <div className="max-w-xl">
        <button
          onClick={() => {
            setSelected(null);
            setPreview(null);
            setError(null);
          }}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          Choose a different client
        </button>

        <h2 className="font-medium">{selected.label}</h2>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Project type
            <select
              value={projectTypeId}
              onChange={(e) => {
                setProjectTypeId(e.target.value);
                generateFor(selected, e.target.value);
              }}
              className="w-fit rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              <option value="">Surprise me</option>
              {PROJECT_TYPE_PACKS.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Difficulty
            <select
              value={difficultyId}
              onChange={(e) => setDifficultyId(e.target.value)}
              className="w-fit rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {preview ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-medium">{preview.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{preview.brief}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Generating a brief…</p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => generateFor(selected, projectTypeId)}
            disabled={isPending}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
          >
            Generate a new brief
          </button>
          <button
            onClick={handleCreate}
            disabled={isPending || !preview}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-[var(--brand-foreground)] disabled:opacity-60"
          >
            Assign to class
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        onClick={generateForRandomArchetype}
        className="w-full rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-left transition hover:border-[var(--brand)]"
      >
        <h2 className="font-medium">Surprise me</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Randomly pick one of the client personalities below.</p>
      </button>
      {ARCHETYPES.map((archetype) => (
        <button
          key={archetype.id}
          onClick={() => generateFor(archetype, projectTypeId)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition hover:border-[var(--brand)]"
        >
          <h2 className="font-medium">{archetype.label}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{archetype.pickerDescription}</p>
        </button>
      ))}
    </div>
  );
}
