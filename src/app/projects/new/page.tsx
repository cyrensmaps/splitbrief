import { Navbar } from "@/components/Navbar";
import { ARCHETYPES } from "@/lib/ai/personas";
import { ArchetypePicker } from "@/components/ArchetypePicker";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Pick a client to work with</h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Each one generates a fresh brief and behaves differently throughout the project. Don&apos;t like the job it
          picked? Generate a new one before you start.
        </p>
        <ArchetypePicker archetypes={ARCHETYPES} />
      </main>
    </div>
  );
}
