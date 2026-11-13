import { askLeaseChat, explainWinner, type WinnerSentenceModel, type LeaseReplyModel } from "@/domain/askLease";
import type { ChatResult } from "@/domain/leaseReply";
import { rankAnalyses, type Ranking, type RankableAnalysis } from "@/domain/rank";
import { isAnalysis, persistedAnalysis } from "@/domain/savedAnalyses";
import type { Analysis } from "@/domain/types";

export type ChatHttpResult = ChatResult | { kind: "invalid" } | { kind: "unavailable" };

export type RecommendHttpResult =
  | { ranking: Ranking; sentence: Awaited<ReturnType<typeof explainWinner>>["sentence"] }
  | { kind: "invalid" };

const MAX_ITEMS = 20;

export async function handleChatRequest(
  body: unknown,
  deps: { hasApiKey: boolean; model: LeaseReplyModel },
): Promise<ChatHttpResult> {
  const parsed = parseChatBody(body);
  if (!parsed) return { kind: "invalid" };
  try {
    return await askLeaseChat({
      question: parsed.question,
      analysis: parsed.analysis,
      hasApiKey: deps.hasApiKey,
      model: deps.model,
    });
  } catch {
    return { kind: "unavailable" };
  }
}

export async function handleRecommendRequest(
  body: unknown,
  deps: { hasApiKey: boolean; model: WinnerSentenceModel },
): Promise<RecommendHttpResult> {
  const items = parseRecommendBody(body);
  if (!items) return { kind: "invalid" };
  try {
    return await explainWinner({ items, hasApiKey: deps.hasApiKey, model: deps.model });
  } catch {
    return { ranking: rankAnalyses(items), sentence: { kind: "unavailable" } };
  }
}

export function questionFromChatBody(body: unknown): { question: string; analysis: unknown } | null {
  const record = objectRecord(body);
  if (!record) return null;
  if (typeof record.question === "string") return { question: record.question, analysis: record.analysis };
  if (!Array.isArray(record.messages)) return null;
  let question = "";
  for (const message of record.messages) {
    const row = objectRecord(message);
    if (!row || row.role !== "user" || !Array.isArray(row.parts)) continue;
    const text = row.parts
      .map((part) => {
        const item = objectRecord(part);
        return item && item.type === "text" && typeof item.text === "string" ? item.text : "";
      })
      .join("");
    if (text.length > 0) question = text;
  }
  return { question, analysis: record.analysis };
}

function parseChatBody(value: unknown): { question: string; analysis: Analysis } | null {
  const request = questionFromChatBody(value);
  if (!request || !isAnalysis(request.analysis)) return null;
  return { question: request.question, analysis: persistedAnalysis(request.analysis) };
}

function parseRecommendBody(value: unknown): RankableAnalysis[] | null {
  const record = objectRecord(value);
  if (!record || !Array.isArray(record.items) || record.items.length > MAX_ITEMS) return null;
  const items: RankableAnalysis[] = [];
  for (const item of record.items) {
    const row = objectRecord(item);
    if (!row || typeof row.id !== "string" || row.id.length === 0 || row.id.length > 80) return null;
    if (!isAnalysis(row.analysis)) return null;
    items.push({ id: row.id, analysis: persistedAnalysis(row.analysis) });
  }
  return items;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
