"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteProject } from "@/app/dashboard/actions";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteProject(project.id);
        setConfirmOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete project");
        setConfirmOpen(false);
      }
    });
  }

  return (
    <div className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--brand)]">
      <button
        onClick={() => setConfirmOpen(true)}
        title="Delete project"
        className="absolute right-3 top-3 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:border-red-400 hover:text-red-600"
      >
        Delete
      </button>

      <Link href={`/projects/${project.id}`} className="block pr-16">
        <h2 className="font-medium">{project.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{project.brief}</p>
      </Link>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-[var(--surface)] p-6 shadow-lg">
            <h3 className="font-medium">Delete this project?</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This permanently deletes &ldquo;{project.title}&rdquo; and its entire chat history. This can&apos;t be
              undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
