import { Navbar } from "@/components/Navbar";
import { ARCHETYPES } from "@/lib/ai/personas";
import { createProject } from "./actions";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Pick a client to work with</h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Each one generates a fresh brief and behaves differently throughout the project.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {ARCHETYPES.map((archetype) => (
            <form key={archetype.id} action={createProject}>
              <input type="hidden" name="archetypeId" value={archetype.id} />
              <button
                type="submit"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition hover:border-[var(--brand)]"
              >
                <h2 className="font-medium">{archetype.label}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{archetype.pickerDescription}</p>
              </button>
            </form>
          ))}
        </div>
      </main>
    </div>
  );
}
