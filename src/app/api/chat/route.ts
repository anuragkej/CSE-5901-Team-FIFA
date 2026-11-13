import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { openAiKeyPresent, openAiLeaseReplyModel } from "@/adapters/openaiLeaseModel";
import { handleChatRequest, questionFromChatBody } from "@/app/chatHandler";
import { replyText } from "@/app/replyText";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const result = await handleChatRequest(questionFromChatBody(body) ?? {}, {
    hasApiKey: openAiKeyPresent(),
    model: openAiLeaseReplyModel(),
  });
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "start", messageMetadata: result });
      writer.write({ type: "text-start", id: "reply" });
      writer.write({ type: "text-delta", id: "reply", delta: replyText(result) });
      writer.write({ type: "text-end", id: "reply" });
      writer.write({ type: "finish" });
    },
    onError: () => "The assistant could not answer just now.",
  });
  return createUIMessageStreamResponse({ stream });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
