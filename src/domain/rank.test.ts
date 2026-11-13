import { describe, expect, it } from "vitest";
import { computeCost } from "./cost";
import { rankAnalyses } from "./rank";
import type { Analysis, ExtractedTerms, Flag, OwnershipStatus, VerdictTone } from "./types";

function lease(options: {
  rent: number | null;
  tone?: VerdictTone;
  flags?: Flag[];
  ownership?: OwnershipStatus;
}): Analysis {
  const terms: ExtractedTerms = {
    address: "10 High St, Columbus, OH 43201",
    bedrooms: 1,
    landlordName: "Ada Landlord",
    monthlyRent: options.rent,
    securityDeposit: options.rent,
    leaseTermMonths: 12,
    fees: [],
    clauses: [],
    paymentMethods: options.flags?.some((flag) => flag.code === "P2P_PAYMENT_REQUEST") ? ["Zelle"] : [],
  };
  const tone = options.tone ?? (options.rent === null ? "incomplete" : "clear");
  return {
    terms,
    cost: computeCost(terms),
    market: {
      fmr: null,
      fmrDeltaPct: null,
      compMedian: null,
      compDeltaPct: null,
      comps: [],
      verdict: "unknown",
    },
    ownership: {
      status: options.ownership ?? "match",
      claimedLandlord: terms.landlordName,
      record: null,
      detail: "checked",
    },
    flags: options.flags ?? [],
    verdict: { tone, headline: tone, summary: tone },
    questions: [],
  };
}

const paymentFlag: Flag = {
  code: "P2P_PAYMENT_REQUEST",
  severity: "danger",
  title: "Payment requested via Zelle",
  detail: "Peer-to-peer apps are a rental scam pattern.",
};

describe("rankAnalyses", () => {
  it("keeps a cheaper scam listing out of the top recommendation", () => {
    const ranking = rankAnalyses([
      {
        id: "scam",
        analysis: lease({
          rent: 40000,
          tone: "stop",
          flags: [paymentFlag],
          ownership: "mismatch",
        }),
      },
      { id: "fair", analysis: lease({ rent: 120000 }) },
    ]);

    expect(ranking.winner?.id).toBe("fair");
    expect(ranking.eligible.map((item) => item.id)).toEqual(["fair"]);
    expect(ranking.blocked.map((item) => item.id)).toEqual(["scam"]);
    expect(ranking.blocked[0].reasons).toEqual(["stop_verdict", "payment_app", "owner_mismatch"]);
  });

  it("keeps input order when true monthly costs tie", () => {
    const forward = rankAnalyses([
      { id: "first", analysis: lease({ rent: 100000 }) },
      { id: "second", analysis: lease({ rent: 100000 }) },
    ]);
    expect(forward.eligible.map((item) => item.id)).toEqual(["first", "second"]);
    expect(forward.winner?.id).toBe("first");
    expect(forward.blocked).toEqual([]);

    const reversed = rankAnalyses([
      { id: "second", analysis: lease({ rent: 100000 }) },
      { id: "first", analysis: lease({ rent: 100000 }) },
    ]);
    expect(reversed.winner?.id).toBe("second");
  });

  it("blocks an analysis with no rent extracted", () => {
    const ranking = rankAnalyses([
      { id: "blank", analysis: lease({ rent: null }) },
      { id: "priced", analysis: lease({ rent: 110000 }) },
    ]);
    expect(ranking.winner?.id).toBe("priced");
    expect(ranking.eligible.map((item) => item.id)).toEqual(["priced"]);
    expect(ranking.blocked).toEqual([
      expect.objectContaining({ id: "blank", reasons: ["no_rent"] }),
    ]);
  });

  it("sorts eligible analyses by true monthly cost ascending", () => {
    const ranking = rankAnalyses([
      { id: "high", analysis: lease({ rent: 180000 }) },
      { id: "low", analysis: lease({ rent: 90000 }) },
      { id: "mid", analysis: lease({ rent: 130000 }) },
    ]);
    expect(ranking.eligible.map((item) => item.id)).toEqual(["low", "mid", "high"]);
    expect(ranking.winner?.id).toBe("low");
  });
});
