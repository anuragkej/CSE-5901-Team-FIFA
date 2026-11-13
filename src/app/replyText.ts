import type { ChatHttpResult } from "./chatHandler";
import type { RefusalReason, Topic } from "@/domain/leaseReply";

export function replyText(result: ChatHttpResult): string {
  switch (result.kind) {
    case "answer":
      return result.answer;
    case "refusal":
      return refusalText(result.reason);
    case "key_missing":
      return "The assistant is not configured on this server. The numbers in the analysis are still available.";
    case "invalid":
      return "That question could not be read. Ask about this analysis.";
    case "unavailable":
      return "The assistant could not answer just now. The analysis numbers are unchanged.";
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

export function refusalText(reason: RefusalReason): string {
  switch (reason) {
    case "legal_advice":
      return "LeaseLens can't give legal advice. The verdict and flags are checks, not a lawyer's opinion.";
    case "off_topic":
      return "Ask about the fees, deposit, clauses, scams, market, or verdict in this analysis.";
    case "jailbreak":
      return "That question tried to change the instructions. Ask about this lease instead.";
    case "not_in_analysis":
      return "That answer would have used a number that is not in this analysis, so it was dropped.";
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
}

export function topicLabel(topic: Topic): string {
  switch (topic) {
    case "fees":
      return "Fees";
    case "deposit":
      return "Deposit";
    case "clauses":
      return "Clauses";
    case "scams":
      return "Scams";
    case "market":
      return "Market";
    case "verdict":
      return "Verdict";
    default: {
      const unreachable: never = topic;
      return unreachable;
    }
  }
}

export function isChatHttpResult(value: unknown): value is ChatHttpResult {
  const record = value && typeof value === "object" ? (value as { kind?: unknown }) : null;
  if (!record || typeof record.kind !== "string") return false;
  switch (record.kind) {
    case "answer":
    case "refusal":
    case "key_missing":
    case "invalid":
    case "unavailable":
      return true;
    default:
      return false;
  }
}
