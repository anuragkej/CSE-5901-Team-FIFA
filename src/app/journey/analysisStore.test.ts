import { describe, expect, it } from "vitest";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { analyze } from "@/domain/analyze";
import { dangerFlags, loadAnalysis, saveAnalysis, type AnalysisStore } from "./analysisStore";

function memory(): AnalysisStore {
  const values = new Map<string, string>();
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("saved analysis", () => {
  it("keeps the Summit Street verdict, true cost, market call, and owner match", async () => {
    const analysis = await analyze({ text: sampleDocuments[0].text }, createPorts());
    const store = memory();
    saveAnalysis(store, analysis);
    const loaded = loadAnalysis(store);

    expect(loaded?.verdict).toEqual({
      tone: "clear",
      headline: "Nothing alarming in this text",
      summary: "No fee, clause, market, or ownership rule fired. Check the numbers below against the document yourself.",
    });
    expect(loaded?.cost?.trueMonthlyCost).toBe(155750);
    expect(loaded?.market.verdict).toBe("at_market");
    expect(loaded?.ownership.status).toBe("match");
    expect(dangerFlags(analysis)).toEqual([]);
  });

  it("keeps the sublease stop verdict and the four danger flags", async () => {
    const analysis = await analyze({ text: sampleDocuments[1].text }, createPorts());
    expect(analysis.verdict.headline).toBe("Do not pay anything yet");
    expect(dangerFlags(analysis).map((flag) => flag.title)).toEqual([
      "Attorney's fees clause is unenforceable in Ohio",
      "Waiver of landlord liability is void in Ohio",
      "Payment requested via Zelle, Cash App",
      "Landlord name does not match county owner record",
    ]);
  });
});
