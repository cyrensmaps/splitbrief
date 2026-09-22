import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { AssignmentComposer } from "@/components/AssignmentComposer";
import type { Classroom } from "@/lib/types";

export default async function NewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .single<Classroom>();

  if (!classroom) notFound();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">New assignment for {classroom.name}</h1>
        <p className="mb-8 text-sm text-[var(--muted)]">
          Every student in this classroom gets the exact same brief, so their work is directly comparable.
        </p>
        <AssignmentComposer classroomId={classroom.id} />
      </main>
    </div>
  );
}
