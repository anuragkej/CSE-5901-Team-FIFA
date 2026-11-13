import type { Analysis, Cadence, Flag, Verdict } from "./types";

/** Field names the model may cite. They name the brief, not the raw lease. */
export const CITATION_FIELDS = [
  "rent",
  "fees",
  "deposit",
  "trueMonthlyCost",
  "moveInCash",
  "landlord",
  "address",
  "verdict",
  "flags",
  "marketNote",
  "questions",
] as const;

export type CitationField = (typeof CITATION_FIELDS)[number];

export interface BriefFee {
  label: string;
  amountCents: number;
  cadence: Cadence;
}

/** What the model is allowed to see. Amounts are integer cents. No lease text. */
export interface AnalysisBrief {
  rentCents: number | null;
  fees: BriefFee[];
  depositCents: number | null;
  trueMonthlyCostCents: number | null;
  moveInCashCents: number | null;
  landlord: string | null;
  address: string | null;
  verdict: Pick<Verdict, "tone" | "headline" | "summary">;
  flags: Array<Pick<Flag, "code" | "severity" | "title">>;
  marketNote: string;
  questions: string[];
}

export function analysisBrief(analysis: Analysis): AnalysisBrief {
  return {
    rentCents: analysis.terms.monthlyRent,
    fees: analysis.terms.fees.map((fee) => ({
      label: fee.label,
      amountCents: fee.amount,
      cadence: fee.cadence,
    })),
    depositCents: analysis.terms.securityDeposit,
    trueMonthlyCostCents: analysis.cost?.trueMonthlyCost ?? null,
    moveInCashCents: analysis.cost?.moveInCash ?? null,
    landlord: analysis.terms.landlordName,
    address: analysis.terms.address,
    verdict: {
      tone: analysis.verdict.tone,
      headline: analysis.verdict.headline,
      summary: analysis.verdict.summary,
    },
    flags: analysis.flags.map((flag) => ({
      code: flag.code,
      severity: flag.severity,
      title: flag.title,
    })),
    marketNote: marketNote(analysis),
    questions: [...analysis.questions],
  };
}

function marketNote(analysis: Analysis): string {
  const market = analysis.market;
  const parts = [`Market verdict: ${marketLabel(market.verdict)}.`];
  if (market.fmr !== null) parts.push(`HUD fair market rent is ${market.fmr} cents.`);
  if (market.compMedian !== null) parts.push(`Median of nearby comps is ${market.compMedian} cents.`);
  if (market.comps.length === 0) parts.push("No comparable listings were found.");
  return parts.join(" ");
}

function marketLabel(verdict: Analysis["market"]["verdict"]): string {
  switch (verdict) {
    case "below_market":
      return "below market";
    case "at_market":
      return "at market";
    case "above_market":
      return "above market";
    case "unknown":
      return "unknown";
    default: {
      const unreachable: never = verdict;
      return unreachable;
    }
  }
}
