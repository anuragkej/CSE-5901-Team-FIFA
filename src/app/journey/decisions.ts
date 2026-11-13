import { money } from "@/app/format";
import type { Analysis } from "@/domain/types";

export interface ComparableOption {
  id: string;
  title: string;
  analysis: Analysis;
}

export function costExplanation(analysis: Analysis): string {
  const cost = analysis.cost;
  if (!cost) return "No monthly rent was found, so there is no true monthly cost yet.";
  const fees = analysis.terms.fees.map((fee) => `${fee.label} (${money(fee.amount)}, ${fee.cadence})`).join("; ");
  const feeText = fees.length > 0 ? ` Fees in the text: ${fees}.` : "";
  return `Advertised rent is ${money(cost.rent)}. Recurring fees add ${money(cost.recurringFees)} and one-time fees add ${money(cost.amortizedOneTimeFees)} per month, for a true monthly cost of ${money(cost.trueMonthlyCost)}.${feeText}`;
}

export function ownerExplanation(analysis: Analysis): string {
  return analysis.ownership.detail;
}

export function marketExplanation(analysis: Analysis): string {
  const market = analysis.market;
  return `The sample market call is ${market.verdict.replaceAll("_", " ")}. Comp median ${money(market.compMedian)} (${market.comps[0]?.source ?? "sample comps"}). Fair market rent ${money(market.fmr)}.`;
}

export function nextQuestions(analysis: Analysis): string[] {
  return analysis.questions;
}

export function rankOptions(options: ComparableOption[]): ComparableOption[] {
  return [...options].sort((left, right) => {
    const leftBlocked = left.analysis.verdict.tone === "stop" ? 1 : 0;
    const rightBlocked = right.analysis.verdict.tone === "stop" ? 1 : 0;
    if (leftBlocked !== rightBlocked) return leftBlocked - rightBlocked;
    const leftCost = left.analysis.cost?.trueMonthlyCost ?? Number.POSITIVE_INFINITY;
    const rightCost = right.analysis.cost?.trueMonthlyCost ?? Number.POSITIVE_INFINITY;
    return leftCost - rightCost;
  });
}
