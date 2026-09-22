import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";

export function ReadOnlyTranscript({
  title,
  subtitle,
  messages,
}: {
  title: string;
  subtitle: string;
  messages: Message[];
}) {
  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-medium">{title}</h2>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <p className="text-sm text-[var(--muted)]">No messages.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
              style={{ background: m.role === "user" ? "var(--background)" : "var(--mentor-accent-soft)" }}
            >
              {m.image_url && <p className="mb-1 text-xs italic text-[var(--muted)]">[image attached]</p>}
              {m.content && (
                <div className="prose prose-sm max-w-none prose-p:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
