import type { Message } from "@/lib/types";

export function formatTranscript(rows: Message[], assistantLabel: string): string {
  return rows
    .map((row) => {
      const speaker = row.role === "user" ? "Designer" : assistantLabel;
      const imageNote = row.image_url ? " [shared an image]" : "";
      return `${speaker}: ${row.content}${imageNote}`;
    })
    .join("\n");
}
