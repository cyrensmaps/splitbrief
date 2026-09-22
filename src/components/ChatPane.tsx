"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { Message, Thread } from "@/lib/types";

type Props = {
  projectId: string;
  thread: Thread;
  title: string;
  subtitle: string;
  accent: "client" | "mentor";
  initialMessages: Message[];
};

export function ChatPane({ projectId, thread, title, subtitle, accent, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const missingPaths = messages
      .filter((m) => m.image_url && !signedUrls[m.image_url])
      .map((m) => m.image_url as string);
    if (missingPaths.length === 0) return;

    const supabase = createClient();
    (async () => {
      const entries = await Promise.all(
        missingPaths.map(async (path) => {
          const { data } = await supabase.storage.from("project-images").createSignedUrl(path, 3600);
          return { path, url: data?.signedUrl };
        })
      );
      const valid: Record<string, string> = {};
      for (const entry of entries) {
        if (entry.url) valid[entry.path] = entry.url;
      }
      if (Object.keys(valid).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...valid }));
      }
    })();
  }, [messages, signedUrls]);

  async function handleSend() {
    if (!text.trim() && !file) return;
    setSending(true);
    setError(null);

    const supabase = createClient();
    let imagePath: string | undefined;
    let imageMediaType: string | undefined;

    if (file) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      imagePath = `${user!.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
      imageMediaType = file.type || "image/png";

      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(imagePath, file, { contentType: imageMediaType });

      if (uploadError) {
        setError("Image upload failed: " + uploadError.message);
        setSending(false);
        return;
      }
      setSignedUrls((prev) => ({ ...prev, [imagePath as string]: URL.createObjectURL(file) }));
    }

    const messageText = text;
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      project_id: projectId,
      thread,
      role: "user",
      content: messageText,
      image_url: imagePath ?? null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, thread, text: messageText, imagePath, imageMediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          project_id: projectId,
          thread,
          role: "assistant",
          content: data.reply,
          image_url: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const accentSoft = accent === "client" ? "var(--client-accent-soft)" : "var(--mentor-accent-soft)";
  const accentColor = accent === "client" ? "var(--client-accent)" : "var(--mentor-accent)";

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3" style={{ background: accentSoft }}>
        <h2 className="font-medium" style={{ color: accentColor }}>
          {title}
        </h2>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No messages yet — say hello to get started.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
              style={{ background: m.role === "user" ? accentSoft : "var(--background)" }}
            >
              {m.image_url && signedUrls[m.image_url] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signedUrls[m.image_url]} alt="Shared design work" className="mb-2 max-h-48 rounded-md" />
              )}
              {m.content && (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-[var(--muted)]">Typing…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 border-t border-[var(--border)] p-3">
        {file && (
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>{file.name}</span>
            <button
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="underline"
            >
              Remove
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            placeholder="Type a message…"
            className="flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
            id={`file-${thread}`}
          />
          <label
            htmlFor={`file-${thread}`}
            title="Attach an image"
            className="cursor-pointer rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          >
            Attach
          </label>
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-60"
            style={{ background: accentColor }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
