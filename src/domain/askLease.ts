import { analysisBrief, type AnalysisBrief } from "./analysisBrief";
import { parseLeaseReply, validateQuotedMoney, validateReply, type ChatResult, type LeaseReply } from "./leaseReply";
import { rankAnalyses, type Ranking, type RankableAnalysis } from "./rank";
import type { Analysis } from "./types";

export const MAX_QUESTION_LENGTH = 1_000;

const JAILBREAK =
  /ignore\s+(?:all\s+|any\s+|previous\s+|prior\s+|your\s+|the\s+)?instructions|disregard\s+(?:all\s+|any\s+|your\s+|the\s+|previous\s+)?instructions/i;

export interface LeaseReplyModel {
  complete(input: { question: string; brief: AnalysisBrief }): Promise<LeaseReply>;
}

export interface WinnerSentenceModel {
  describe(brief: AnalysisBrief): Promise<string>;
}

export async function askLeaseChat(input: {
  question: string;
  analysis: Analysis;
  hasApiKey: boolean;
  model: LeaseReplyModel;
}): Promise<ChatResult> {
  if (!input.hasApiKey) return { kind: "key_missing" };
  const question = input.question.trim();
  if (question.length === 0 || question.length > MAX_QUESTION_LENGTH) {
    return { kind: "refusal", reason: "off_topic" };
  }
  if (JAILBREAK.test(question)) return { kind: "refusal", reason: "jailbreak" };
  const reply = await input.model.complete({ question, brief: analysisBrief(input.analysis) });
  const parsed = parseLeaseReply(reply);
  if (!parsed) return { kind: "refusal", reason: "not_in_analysis" };
  return validateReply(parsed, input.analysis);
}

export type WinnerSentence =
  | { kind: "sentence"; text: string }
  | { kind: "refusal"; reason: "not_in_analysis" }
  | { kind: "key_missing" }
  | { kind: "none" }
  | { kind: "unavailable" };

/** Rank first. The model may describe only the winner the ranker already chose. */
export async function explainWinner(input: {
  items: readonly RankableAnalysis[];
  hasApiKey: boolean;
  model: WinnerSentenceModel;
}): Promise<{ ranking: Ranking; sentence: WinnerSentence }> {
  const ranking = rankAnalyses(input.items);
  if (!ranking.winner) return { ranking, sentence: { kind: "none" } };
  if (!input.hasApiKey) return { ranking, sentence: { kind: "key_missing" } };
  const text = firstSentence(await input.model.describe(analysisBrief(ranking.winner.analysis)));
  if (text.length === 0 || !validateQuotedMoney(text, ranking.winner.analysis)) {
    return { ranking, sentence: { kind: "refusal", reason: "not_in_analysis" } };
  }
  return { ranking, sentence: { kind: "sentence", text } };
}

/** One sentence, keeping a price like $1,557.50 intact. */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char !== "." && char !== "!" && char !== "?") continue;
    const precededByDigit = index > 0 && trimmed[index - 1] >= "0" && trimmed[index - 1] <= "9";
    const followedByDigit = trimmed[index + 1] >= "0" && trimmed[index + 1] <= "9";
    if (char === "." && precededByDigit && followedByDigit) continue;
    const next = trimmed[index + 1];
    if (next === undefined || /\s/.test(next)) return trimmed.slice(0, index + 1).trim();
  }
  return trimmed;
}
