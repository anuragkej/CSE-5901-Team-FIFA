import type { Analysis } from "./types";

export const BLOCK_REASONS = ["stop_verdict", "payment_app", "owner_mismatch", "no_rent"] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number];

export interface RankableAnalysis {
  id: string;
  analysis: Analysis;
}

export interface BlockedAnalysis {
  id: string;
  analysis: Analysis;
  reasons: BlockReason[];
}

export interface Ranking {
  eligible: RankableAnalysis[];
  blocked: BlockedAnalysis[];
  /** First eligible analysis after sorting by true monthly cost. Null when none qualify. */
  winner: RankableAnalysis | null;
}

const PAYMENT_APP_FLAG = "P2P_PAYMENT_REQUEST";

export function blockReasons(analysis: Analysis): BlockReason[] {
  const reasons: BlockReason[] = [];
  if (analysis.verdict.tone === "stop") reasons.push("stop_verdict");
  if (analysis.flags.some((flag) => flag.code === PAYMENT_APP_FLAG)) reasons.push("payment_app");
  if (analysis.ownership.status === "mismatch") reasons.push("owner_mismatch");
  if (analysis.terms.monthlyRent === null || analysis.cost === null) reasons.push("no_rent");
  return reasons;
}

/**
 * Eligible analyses sort by true monthly cost, lowest first. Equal costs keep
 * their input order. Stop verdicts, payment-app flags, owner mismatches, and
 * analyses with no rent are blocked and are not recommended.
 */
export function rankAnalyses(items: readonly RankableAnalysis[]): Ranking {
  const eligible: RankableAnalysis[] = [];
  const blocked: BlockedAnalysis[] = [];
  for (const item of items) {
    const reasons = blockReasons(item.analysis);
    if (reasons.length > 0) blocked.push({ id: item.id, analysis: item.analysis, reasons });
    else eligible.push(item);
  }
  eligible.sort((left, right) => {
    const leftCost = left.analysis.cost?.trueMonthlyCost ?? Number.POSITIVE_INFINITY;
    const rightCost = right.analysis.cost?.trueMonthlyCost ?? Number.POSITIVE_INFINITY;
    return leftCost - rightCost;
  });
  return { eligible, blocked, winner: eligible[0] ?? null };
}
