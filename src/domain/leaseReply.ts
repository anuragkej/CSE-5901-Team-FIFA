import { z } from "zod";
import { CITATION_FIELDS, type CitationField } from "./analysisBrief";
import type { Analysis } from "./types";

export const TOPICS = ["fees", "deposit", "clauses", "scams", "market", "verdict"] as const;
export type Topic = (typeof TOPICS)[number];

export const REFUSAL_REASONS = ["legal_advice", "off_topic", "jailbreak", "not_in_analysis"] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];

export interface LeaseAnswer {
  kind: "answer";
  topic: Topic;
  answer: string;
  citations: CitationField[];
}

export interface LeaseRefusal {
  kind: "refusal";
  reason: RefusalReason;
}

/** Model output. A missing API key is not something the model says. */
export type LeaseReply = LeaseAnswer | LeaseRefusal;

export type ChatResult = LeaseReply | { kind: "key_missing" };

export const leaseReplySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("answer"),
    topic: z.enum(TOPICS),
    answer: z.string(),
    citations: z.array(z.enum(CITATION_FIELDS)),
  }),
  z.object({
    kind: z.literal("refusal"),
    reason: z.enum(REFUSAL_REASONS),
  }),
]);

export function parseLeaseReply(value: unknown): LeaseReply | null {
  const parsed = leaseReplySchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

const DOLLAR = /\$\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;
const CENTS = /\b(\d{1,9})\s+cents\b/g;

/** Dollar amounts and explicit cent amounts. A null entry could not be parsed safely. */
export function moneyFiguresCents(text: string): Array<number | null> {
  const figures: Array<number | null> = [];
  const withoutDollars = text.replace(DOLLAR, (_match, dollars: string, fraction?: string) => {
    figures.push(dollarToCents(dollars, fraction));
    return " ";
  });
  for (const match of withoutDollars.matchAll(CENTS)) {
    figures.push(Number(match[1]));
  }
  return figures;
}

function dollarToCents(dollars: string, fraction: string | undefined): number | null {
  const whole = Number(dollars.replace(/,/g, ""));
  if (!Number.isSafeInteger(whole)) return null;
  const frac = fraction ? Number(fraction.padEnd(2, "0")) : 0;
  const cents = whole * 100 + frac;
  return Number.isSafeInteger(cents) ? cents : null;
}

export function amountsInAnalysis(analysis: Analysis): Set<number> {
  const amounts = new Set<number>();
  const add = (value: number | null | undefined) => {
    if (typeof value === "number" && Number.isFinite(value)) amounts.add(value);
  };
  add(analysis.terms.monthlyRent);
  add(analysis.terms.securityDeposit);
  for (const fee of analysis.terms.fees) add(fee.amount);
  if (analysis.cost) {
    add(analysis.cost.rent);
    add(analysis.cost.recurringFees);
    add(analysis.cost.amortizedOneTimeFees);
    add(analysis.cost.trueMonthlyCost);
    add(analysis.cost.moveInCash);
  }
  add(analysis.market.fmr);
  add(analysis.market.compMedian);
  for (const comp of analysis.market.comps) add(comp.rent);
  return amounts;
}

/** Every quoted money figure must already be in the analysis. This is the determinism. */
export function validateQuotedMoney(text: string, analysis: Analysis): boolean {
  const allowed = amountsInAnalysis(analysis);
  return moneyFiguresCents(text).every((figure) => figure !== null && allowed.has(figure));
}

export function validateReply(reply: LeaseReply, analysis: Analysis): LeaseReply {
  switch (reply.kind) {
    case "refusal":
      return reply;
    case "answer": {
      const answer = reply.answer.trim();
      if (answer.length === 0 || !validateQuotedMoney(answer, analysis)) {
        return { kind: "refusal", reason: "not_in_analysis" };
      }
      return { kind: "answer", topic: reply.topic, answer, citations: reply.citations };
    }
    default: {
      const unreachable: never = reply;
      return unreachable;
    }
  }
}
