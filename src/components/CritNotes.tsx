"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  projectId: string;
  initialNotes: string | null;
  initialGeneratedAt: string | null;
};

export function CritNotes({ projectId, initialNotes, initialGeneratedAt }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate crit notes");
      setNotes(data.notes);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate crit notes");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!notes) return;
    const blob = new Blob([notes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crit-notes.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Crit notes</h2>
          {generatedAt && (
            <p className="text-xs text-[var(--muted)]">Generated {new Date(generatedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          {notes && (
            <button
              onClick={handleDownload}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            >
              Download .md
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm text-[var(--brand-foreground)] disabled:opacity-60"
          >
            {loading ? "Generating…" : notes ? "Regenerate" : "Generate crit notes"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {notes ? (
        <div className="prose prose-sm mt-4 max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
        </div>
      ) : (
        !loading && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Get an AI-written summary of the feedback from this project, pulled from both chats.
          </p>
        )
      )}
    </div>
  );
}
