import { describe, expect, it } from "vitest";
import type { CostBreakdown, Flag } from "./types";
import { deriveVerdict } from "./verdict";

const cost: CostBreakdown = {
  rent: 145000,
  recurringFees: 0,
  amortizedOneTimeFees: 0,
  trueMonthlyCost: 145000,
  moveInCash: 290000,
  hiddenCostRatio: 0,
  termMonths: 12,
};

function flag(code: string, severity: Flag["severity"], title: string): Flag {
  return { code, severity, title, detail: "" };
}

describe("deriveVerdict", () => {
  it("stops instead of asking for more when a danger flag fired without rent", () => {
    const result = deriveVerdict(
      [flag("P2P_PAYMENT_REQUEST", "danger", "Payment requested via Zelle"), flag("RENT_NOT_FOUND", "info", "Could not find a monthly rent amount")],
      null,
    );
    expect(result).toEqual({ tone: "stop", headline: "Do not pay anything yet", summary: "Payment requested via Zelle." });
  });

  it("is incomplete without rent when nothing is dangerous", () => {
    expect(deriveVerdict([flag("RENT_NOT_FOUND", "info", "Could not find a monthly rent amount")], null)).toEqual({
      tone: "incomplete",
      headline: "We need more of the document",
      summary: "No monthly rent was found, so cost and market checks were skipped. Paste the section that states the rent.",
    });
  });

  it("says do not pay when a scam signal is among the dangers", () => {
    const flags = [
      flag("ATTORNEY_FEES_CLAUSE", "danger", "Attorney's fees clause is unenforceable in Ohio"),
      flag("P2P_PAYMENT_REQUEST", "danger", "Payment requested via Zelle"),
      flag("OWNERSHIP_MISMATCH", "danger", "Landlord name does not match county owner record"),
      flag("DEPOSIT_OVER_TWO_MONTHS", "warning", "Security deposit is more than two months' rent"),
    ];
    expect(deriveVerdict(flags, cost)).toEqual({
      tone: "stop",
      headline: "Do not pay anything yet",
      summary:
        "Attorney's fees clause is unenforceable in Ohio. Payment requested via Zelle. Landlord name does not match county owner record.",
    });
  });

  it("says do not sign when dangers are only void clauses", () => {
    const result = deriveVerdict([flag("CONFESSION_OF_JUDGMENT", "danger", "Confession of judgment clause is void in Ohio")], cost);
    expect(result.tone).toBe("stop");
    expect(result.headline).toBe("Do not sign as written");
    expect(result.summary).toBe("Confession of judgment clause is void in Ohio.");
  });

  it("is caution with warnings only and clear with info or nothing", () => {
    expect(deriveVerdict([flag("HIGH_HIDDEN_COSTS", "warning", "Fees add 18% on top of advertised rent")], cost)).toEqual({
      tone: "caution",
      headline: "Read these before you sign",
      summary: "Fees add 18% on top of advertised rent.",
    });
    expect(deriveVerdict([flag("AUTO_RENEWAL", "info", "Lease renews automatically")], cost).tone).toBe("clear");
    expect(deriveVerdict([], cost)).toEqual({
      tone: "clear",
      headline: "Nothing alarming in this text",
      summary: "No fee, clause, market, or ownership rule fired. Check the numbers below against the document yourself.",
    });
  });
});
