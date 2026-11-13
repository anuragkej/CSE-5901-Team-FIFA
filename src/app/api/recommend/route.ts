import { openAiKeyPresent, openAiWinnerModel } from "@/adapters/openaiLeaseModel";
import { handleRecommendRequest } from "@/app/chatHandler";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  const result = await handleRecommendRequest(body, {
    hasApiKey: openAiKeyPresent(),
    model: openAiWinnerModel(),
  });
  const status = "kind" in result && result.kind === "invalid" ? 400 : 200;
  return Response.json(result, { status });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
