import { openAiKeyPresent, openAiLeaseReplyModel } from "@/adapters/openaiLeaseModel";
import { handleChatRequest } from "@/app/chatHandler";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const result = await handleChatRequest(body, {
    hasApiKey: openAiKeyPresent(),
    model: openAiLeaseReplyModel(),
  });
  return Response.json(result, { status: result.kind === "invalid" ? 400 : 200 });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
