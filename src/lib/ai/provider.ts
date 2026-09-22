import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  image?: { base64: string; mediaType: string };
};

type GetReplyOptions = {
  provider: "anthropic" | "openai";
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: ChatMessage[];
};

export async function getChatReply(opts: GetReplyOptions): Promise<string> {
  if (opts.provider === "anthropic") {
    return getAnthropicReply(opts);
  }
  return getOpenAiReply(opts);
}

async function getAnthropicReply({ apiKey, model, systemPrompt, history }: GetReplyOptions) {
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = history.map((m) => {
    const content: Anthropic.ContentBlockParam[] = [];
    if (m.image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: m.image.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: m.image.base64,
        },
      });
    }
    content.push({ type: "text", text: m.text || "(sent an image)" });
    return { role: m.role, content };
  });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

async function getOpenAiReply({ apiKey, model, systemPrompt, history }: GetReplyOptions) {
  const client = new OpenAI({ apiKey });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
      if (m.image) {
        return {
          role: m.role,
          content: [
            { type: "text", text: m.text || "(sent an image)" },
            {
              type: "image_url",
              image_url: { url: `data:${m.image.mediaType};base64,${m.image.base64}` },
            },
          ],
        } as OpenAI.Chat.ChatCompletionMessageParam;
      }
      return { role: m.role, content: m.text };
    }),
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
  });

  return response.choices[0]?.message?.content ?? "";
}
