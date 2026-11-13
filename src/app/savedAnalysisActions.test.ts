import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Analysis } from "@/domain/types";
import { memoryAnalysisStore } from "@/domain/savedAnalyses";
import { listAnalysesAction, saveAnalysisAction } from "./savedAnalysisActions";

const auth = vi.hoisted(() => ({
  session: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  saveSignedInAnalysis: vi.fn(),
  listSignedInAnalyses: vi.fn(),
}));

vi.mock("@/adapters/supabase", () => ({
  requestAuth: async () => auth,
  saveSignedInAnalysis: storage.saveSignedInAnalysis,
  listSignedInAnalyses: storage.listSignedInAnalyses,
}));

const analysis = {
  terms: {
    address: "2115 Summit St",
    bedrooms: 2,
    landlordName: "Buckeye Campus Properties LLC",
    monthlyRent: 145000,
    securityDeposit: 145000,
    leaseTermMonths: 12,
    fees: [],
    clauses: [],
    paymentMethods: [],
  },
  cost: {
    rent: 145000,
    recurringFees: 0,
    amortizedOneTimeFees: 0,
    trueMonthlyCost: 145000,
    moveInCash: 290000,
    hiddenCostRatio: 0,
    termMonths: 12,
  },
  market: {
    fmr: null,
    fmrDeltaPct: null,
    compMedian: null,
    compDeltaPct: null,
    comps: [],
    verdict: "unknown",
  },
  ownership: { status: "not_checked", claimedLandlord: null, record: null, detail: "Not checked." },
  flags: [],
  verdict: { tone: "clear", headline: "Clear", summary: "Clear." },
  questions: [],
} satisfies Analysis;

describe("saveAnalysisAction", () => {
  beforeEach(() => {
    auth.session.mockReset();
    storage.saveSignedInAnalysis.mockReset();
    storage.listSignedInAnalyses.mockReset();
  });

  it("does not save when nobody is signed in", async () => {
    auth.session.mockResolvedValue(null);
    expect(await saveAnalysisAction(analysis)).toEqual({ kind: "signed_out" });
    expect(storage.saveSignedInAnalysis).not.toHaveBeenCalled();
  });

  it("rejects a payload that is not an analysis", async () => {
    auth.session.mockResolvedValue({ userId: "student-a", email: "a@osu.edu" });
    expect(await saveAnalysisAction({ text: "the whole lease" })).toEqual({ kind: "invalid" });
    expect(storage.saveSignedInAnalysis).not.toHaveBeenCalled();
  });

  it("saves for the signed-in student and lists only that student's rows", async () => {
    const store = memoryAnalysisStore();
    storage.saveSignedInAnalysis.mockImplementation(async (userId: string, value: Analysis) => ({
      record: await store.save(userId, value),
      storage: "memory",
    }));
    storage.listSignedInAnalyses.mockImplementation(async (userId: string) => ({
      records: await store.list(userId),
      storage: "memory",
    }));

    auth.session.mockResolvedValue({ userId: "student-a", email: "a@osu.edu" });
    const saved = await saveAnalysisAction(analysis);
    expect(saved.kind).toBe("saved");
    if (saved.kind !== "saved") return;
    expect(saved.storage).toBe("memory");
    expect(storage.saveSignedInAnalysis).toHaveBeenCalledWith("student-a", analysis);

    auth.session.mockResolvedValue({ userId: "student-b", email: "b@osu.edu" });
    expect(await listAnalysesAction()).toEqual({ kind: "list", records: [], storage: "memory" });

    auth.session.mockResolvedValue({ userId: "student-a", email: "a@osu.edu" });
    const listed = await listAnalysesAction();
    expect(listed.kind).toBe("list");
    if (listed.kind !== "list") return;
    expect(listed.records.map((record) => record.id)).toEqual([saved.id]);
  });
});
