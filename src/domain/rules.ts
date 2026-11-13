import type {
  Cents,
  Clause,
  ClauseTopic,
  CostBreakdown,
  ExtractedTerms,
  Flag,
  MarketComparison,
  OwnershipCheck,
} from "./types";

export interface RuleContext {
  terms: ExtractedTerms;
  cost: CostBreakdown | null;
  market: MarketComparison;
  ownership: OwnershipCheck;
}

type Rule = (ctx: RuleContext) => Flag | null;

const HIDDEN_COST_WARN_RATIO = 0.15;
const ABOVE_MARKET_WARN = 0.15;
const TOO_GOOD_TO_BE_TRUE = -0.25;
const LATE_FEE_WARN_RATIO = 0.1;

function clause(terms: ExtractedTerms, topic: ClauseTopic): Clause | undefined {
  return terms.clauses.find((c) => c.topic === topic);
}

function pct(value: number): string {
  return `${Math.round(Math.abs(value) * 100)}%`;
}

/** Share of monthly rent a late fee represents. When the sentence states both a percent and a dollar amount, the larger share is used. */
function lateFeeShare(excerpt: string, rent: Cents): number | null {
  const shares: number[] = [];
  const percent = excerpt.match(/(\d+(?:\.\d+)?)\s*(?:%|percent\b)/i);
  if (percent) shares.push(Number(percent[1]) / 100);
  // The amount after "late fee", not the first dollar figure: "If rent of $1,200 is late, a late fee of $50" is $50.
  const amount = excerpt.match(/late\s+(?:fee|charge)\b[^$\n]{0,80}?\$\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (amount && rent > 0) shares.push((Number(amount[1].replace(/,/g, "")) * 100) / rent);
  if (shares.length === 0) return null;
  return Math.max(...shares);
}

const prohibitedClauses: Rule[] = [
  (ctx) => {
    const c = clause(ctx.terms, "attorney_fees");
    return c
      ? {
          code: "ATTORNEY_FEES_CLAUSE",
          severity: "danger",
          title: "Attorney's fees clause is unenforceable in Ohio",
          detail:
            "Ohio does not recognize any agreement to pay the landlord's attorney's fees in a residential lease. Its presence suggests a template that was not written for Ohio, or a landlord who expects you not to know.",
          basis: "ORC 5321.13(C)",
          excerpt: c.excerpt,
        }
      : null;
  },
  (ctx) => {
    const c = clause(ctx.terms, "confession_of_judgment");
    return c
      ? {
          code: "CONFESSION_OF_JUDGMENT",
          severity: "danger",
          title: "Confession of judgment clause is void in Ohio",
          detail: "A warrant of attorney to confess judgment cannot be recognized in an Ohio residential rental agreement.",
          basis: "ORC 5321.13(B)",
          excerpt: c.excerpt,
        }
      : null;
  },
  (ctx) => {
    const c = clause(ctx.terms, "landlord_liability_waiver");
    return c
      ? {
          code: "LANDLORD_LIABILITY_WAIVER",
          severity: "danger",
          title: "Waiver of landlord liability is void in Ohio",
          detail: "Tenants cannot agree to exculpate or indemnify the landlord for liability arising under law.",
          basis: "ORC 5321.13(D)",
          excerpt: c.excerpt,
        }
      : null;
  },
];

const depositRules: Rule[] = [
  (ctx) => {
    const { securityDeposit, monthlyRent } = ctx.terms;
    if (securityDeposit === null || monthlyRent === null) return null;
    if (securityDeposit > monthlyRent * 2) {
      return {
        code: "DEPOSIT_OVER_TWO_MONTHS",
        severity: "warning",
        title: "Security deposit is more than two months' rent",
        detail: "Unusually large for Columbus student housing. Ohio has no cap, but deposits above one month's rent must earn 5% annual interest if you stay six months or more.",
        basis: "ORC 5321.16(A)",
      };
    }
    if (securityDeposit > monthlyRent) {
      return {
        code: "DEPOSIT_OVER_ONE_MONTH",
        severity: "info",
        title: "Deposit exceeds one month's rent",
        detail: "The excess over one month's rent (or $50, whichever is greater) must earn 5% annual interest paid to you yearly if you stay six months or more.",
        basis: "ORC 5321.16(A)",
      };
    }
    return null;
  },
  (ctx) => {
    const fee = ctx.terms.fees.find((f) => f.category === "deposit" && !f.refundable);
    return fee
      ? {
          code: "NON_REFUNDABLE_DEPOSIT",
          severity: "warning",
          title: `"Non-refundable deposit" is really a fee (${fee.label})`,
          detail: "A deposit is by definition refundable. Calling a fee a deposit hides the true cost of moving in. We count it as a one-time fee.",
          excerpt: fee.excerpt,
        }
      : null;
  },
];

const scamRules: Rule[] = [
  (ctx) => {
    if (ctx.terms.paymentMethods.length === 0) return null;
    const c = clause(ctx.terms, "payment_method");
    return {
      code: "P2P_PAYMENT_REQUEST",
      severity: "danger",
      title: `Payment requested via ${ctx.terms.paymentMethods.join(", ")}`,
      detail: "Peer-to-peer apps, wire transfers and gift cards are irreversible and the most common pattern in rental deposit scams. Never pay before touring the unit and verifying ownership.",
      basis: "FTC rental scam guidance",
      excerpt: c?.excerpt,
    };
  },
  (ctx) => {
    if (ctx.ownership.status !== "mismatch") return null;
    return {
      code: "OWNERSHIP_MISMATCH",
      severity: "danger",
      title: "Landlord name does not match county owner record",
      detail: ctx.ownership.detail,
      basis: "Franklin County Auditor parcel record",
    };
  },
  (ctx) => {
    if (ctx.ownership.status !== "no_record") return null;
    return {
      code: "NO_PARCEL_RECORD",
      severity: "warning",
      title: "Could not find this address in county records",
      detail: ctx.ownership.detail,
    };
  },
  (ctx) => {
    const delta = ctx.market.compDeltaPct ?? ctx.market.fmrDeltaPct;
    if (delta === null || delta > TOO_GOOD_TO_BE_TRUE) return null;
    return {
      code: "RENT_FAR_BELOW_MARKET",
      severity: "warning",
      title: `Rent is ${pct(delta)} below comparable units`,
      detail: "Prices far under market are a classic bait in listing scams. Confirm the unit exists and the poster controls it before paying anything.",
    };
  },
];

const costRules: Rule[] = [
  (ctx) => {
    if (!ctx.cost || ctx.cost.hiddenCostRatio < HIDDEN_COST_WARN_RATIO) return null;
    return {
      code: "HIGH_HIDDEN_COSTS",
      severity: "warning",
      title: `Fees add ${pct(ctx.cost.hiddenCostRatio)} on top of advertised rent`,
      detail: "Compare units on true monthly cost, not headline rent.",
    };
  },
  (ctx) => {
    const delta = ctx.market.compDeltaPct;
    if (delta === null || delta < ABOVE_MARKET_WARN) return null;
    return {
      code: "RENT_ABOVE_MARKET",
      severity: "warning",
      title: `Rent is ${pct(delta)} above the median of comparable units`,
      detail: "You have room to negotiate or keep looking.",
    };
  },
  (ctx) => {
    const c = clause(ctx.terms, "late_fee");
    const rent = ctx.terms.monthlyRent;
    if (!c || rent === null) return null;
    const share = lateFeeShare(c.excerpt, rent);
    if (share === null || share < LATE_FEE_WARN_RATIO) return null;
    return {
      code: "HIGH_LATE_FEE",
      severity: "warning",
      title: "Late fee is 10% of rent or more",
      detail: "Ohio has no statutory cap, but courts have struck down late fees that are punitive rather than a reasonable estimate of the landlord's cost.",
      excerpt: c.excerpt,
    };
  },
  (ctx) => {
    const c = clause(ctx.terms, "auto_renewal");
    return c
      ? {
          code: "AUTO_RENEWAL",
          severity: "info",
          title: "Lease renews automatically",
          detail: "Put the notice deadline in your calendar now. Missing it can lock you in for another term.",
          excerpt: c.excerpt,
        }
      : null;
  },
  (ctx) =>
    ctx.terms.monthlyRent === null
      ? {
          code: "RENT_NOT_FOUND",
          severity: "info",
          title: "Could not find a monthly rent amount",
          detail: "Cost and market comparison are skipped. Paste the section of the lease that states the rent.",
        }
      : null,
];

export const rules: Rule[] = [...prohibitedClauses, ...depositRules, ...scamRules, ...costRules];

const severityOrder: Record<Flag["severity"], number> = { danger: 0, warning: 1, info: 2 };

export function evaluateRules(ctx: RuleContext): Flag[] {
  return rules
    .map((rule) => rule(ctx))
    .filter((flag): flag is Flag => flag !== null)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
