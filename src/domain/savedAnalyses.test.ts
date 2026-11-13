import { describe, expect, it } from "vitest";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { analyze } from "./analyze";
import { isAnalysis, memoryAnalysisStore, persistedAnalysis } from "./savedAnalyses";

describe("saved analyses", () => {
  it("keeps a real analysis and hides it from every other student", async () => {
    const analysis = await analyze({ text: sampleDocuments[0].text }, createPorts());
    expect(isAnalysis(analysis)).toBe(true);

    const store = memoryAnalysisStore();
    const saved = await store.save("student-a", analysis);
    await store.save("student-b", analysis);

    const own = await store.list("student-a");
    expect(own.map((record) => record.id)).toEqual([saved.id]);
    expect(own[0].userId).toBe("student-a");
    expect(own[0].analysis.cost?.trueMonthlyCost).toBe(analysis.cost?.trueMonthlyCost);
    expect(own[0].analysis.verdict).toEqual(analysis.verdict);
    expect(await store.list("student-c")).toEqual([]);
    expect((await store.list("student-b")).map((record) => record.id)).not.toContain(saved.id);
  });

  it("does not keep a pasted lease that was attached beside the analysis", async () => {
    const analysis = await analyze({ text: sampleDocuments[0].text }, createPorts());
    const withLease = { ...analysis, text: "FULL_PASTED_LEASE_NOT_STORED" };
    const stored = persistedAnalysis(withLease);
    expect(stored).not.toHaveProperty("text");
    expect(JSON.stringify(stored)).not.toContain("FULL_PASTED_LEASE_NOT_STORED");
    expect(isAnalysis(stored)).toBe(true);
  });

  it("rejects a payload that is not an analysis", () => {
    expect(isAnalysis(null)).toBe(false);
    expect(isAnalysis({ text: "a lease", verdict: { tone: "clear", headline: "ok", summary: "ok" } })).toBe(false);
  });
});
