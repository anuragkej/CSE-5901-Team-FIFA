import { describe, expect, it } from "vitest";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { analyze } from "./analyze";

const ports = createPorts();
const doc = (id: string) => sampleDocuments.find((d) => d.id === id)!.text;

describe("analyze: standard lease", () => {
  it("extracts terms, computes true cost, matches owner, and raises no danger flags", async () => {
    const result = await analyze({ text: doc("standard-lease") }, ports);

    expect(result.terms.address).toBe("2115 Summit St, Apt 2, Columbus, OH 43201");
    expect(result.terms.bedrooms).toBe(2);
    expect(result.terms.landlordName).toBe("Buckeye Campus Properties LLC");
    expect(result.terms.monthlyRent).toBe(145000);
    expect(result.terms.securityDeposit).toBe(145000);
    expect(result.terms.leaseTermMonths).toBe(12);
    expect(result.terms.fees.map((f) => [f.category, f.amount, f.cadence])).toEqual([
      ["admin", 15000, "one_time"],
      ["utility", 4500, "monthly"],
      ["parking", 5000, "monthly"],
    ]);

    expect(result.cost?.trueMonthlyCost).toBe(155750);
    expect(result.cost?.moveInCash).toBe(305000);

    expect(result.market.compMedian).toBe(146500);
    expect(result.market.comps.map((c) => c.id)).toEqual(["L002", "L003", "L004", "L006"]);
    expect(result.market.verdict).toBe("at_market");
    expect(result.ownership.status).toBe("match");

    expect(result.flags.map((f) => f.code)).toEqual([]);
    expect(result.verdict.tone).toBe("clear");
  });
});

describe("analyze: suspicious sublease", () => {
  it("raises the scam and unenforceable-clause flags in severity order", async () => {
    const result = await analyze({ text: doc("suspicious-sublease") }, ports);

    expect(result.terms.monthlyRent).toBe(65000);
    expect(result.terms.securityDeposit).toBe(200000);
    expect(result.terms.landlordName).toBe("Marcus Bell");
    expect(result.terms.paymentMethods).toEqual(["Zelle", "Cash App"]);
    expect(result.ownership.status).toBe("mismatch");
    expect(result.ownership.record?.ownerName).toBe("TWELFTH AVENUE HOLDINGS LLC");

    expect(result.flags.map((f) => f.code)).toEqual([
      "ATTORNEY_FEES_CLAUSE",
      "LANDLORD_LIABILITY_WAIVER",
      "P2P_PAYMENT_REQUEST",
      "OWNERSHIP_MISMATCH",
      "DEPOSIT_OVER_TWO_MONTHS",
      "NON_REFUNDABLE_DEPOSIT",
      "RENT_FAR_BELOW_MARKET",
      "HIGH_LATE_FEE",
      "AUTO_RENEWAL",
    ]);
    expect(result.flags.filter((f) => f.severity === "danger")).toHaveLength(4);
    expect(result.verdict).toEqual({
      tone: "stop",
      headline: "Do not pay anything yet",
      summary:
        "Attorney's fees clause is unenforceable in Ohio. Waiver of landlord liability is void in Ohio. Payment requested via Zelle, Cash App.",
    });
    expect(result.market.compDeltaPct).toBeCloseTo((65000 - 143000) / 143000, 6);
  });
});

describe("analyze: scam listing without rent", () => {
  it("says stop, not incomplete", async () => {
    const result = await analyze(
      { text: "Nice 2 bedroom near campus, available now! Send the $800 holding payment by Zelle today to reserve it." },
      ports,
    );
    expect(result.cost).toBeNull();
    expect(result.verdict.tone).toBe("stop");
    expect(result.verdict.headline).toBe("Do not pay anything yet");
  });
});

describe("analyze: pasted listing", () => {
  it("works without a lease and surfaces high fee load", async () => {
    const result = await analyze({ text: doc("pasted-listing") }, ports);

    expect(result.terms.monthlyRent).toBe(139500);
    expect(result.terms.bedrooms).toBe(1);
    expect(result.terms.securityDeposit).toBeNull();
    expect(result.terms.fees.map((f) => [f.label, f.category, f.amount, f.cadence])).toEqual([
      ["sewer and trash fee", "utility", 6000, "monthly"],
      ["Technology package fee", "amenity", 8500, "monthly"],
      ["Application fee", "admin", 7500, "one_time"],
      ["Pet fee", "pet", 30000, "one_time"],
      ["pet rent", "pet", 3500, "monthly"],
    ]);
    expect(result.cost?.recurringFees).toBe(18000);
    expect(result.cost?.trueMonthlyCost).toBe(139500 + 18000 + 625 + 2500);
    expect(result.flags.map((f) => f.code)).toContain("HIGH_HIDDEN_COSTS");
    expect(result.flags.map((f) => f.code)).toContain("NO_PARCEL_RECORD");
    expect(result.flags.map((f) => f.code)).toContain("RENT_ABOVE_MARKET");
    expect(result.market.compMedian).toBe(118000);
    expect(result.market.comps.map((c) => c.id)).not.toContain("L007");
  });

  it("lets explicit input override extracted address and bedrooms", async () => {
    const result = await analyze(
      { text: "Rent $1,200 per month.", address: "1888 N 4th St, Columbus, OH 43201", bedrooms: 2, landlordName: "Thanh Nguyen" },
      ports,
    );
    expect(result.ownership.status).toBe("match");
    expect(result.market.fmr).toBe(143000);
  });

  it("does not let NaN or an out-of-range bedroom count replace the lease", async () => {
    const nan = await analyze({ text: doc("standard-lease"), bedrooms: Number.NaN }, ports);
    expect(nan.terms.bedrooms).toBe(2);
    expect(nan.market.comps.length).toBeGreaterThan(0);

    const fractional = await analyze({ text: doc("standard-lease"), bedrooms: 2.5 }, ports);
    expect(fractional.terms.bedrooms).toBe(2);

    const studio = await analyze({ text: doc("pasted-listing"), bedrooms: 0 }, ports);
    expect(studio.terms.bedrooms).toBe(0);
  });
});
