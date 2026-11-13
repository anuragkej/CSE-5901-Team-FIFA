import { describe, expect, it, vi } from "vitest";
import type { LeaseReplyModel, WinnerSentenceModel } from "@/domain/askLease";
import type { Analysis } from "@/domain/types";
import { chatErrorLine, handleChatRequest, handleRecommendRequest, questionFromChatBody } from "./chatHandler";

const LEASE = "FULL_PASTED_LEASE_SHOULD_NOT_BE_SENT";

const analysis = {
  terms: {
    address: "2115 Summit St",
    bedrooms: 2,
    landlordName: "Buckeye Campus Properties LLC",
    monthlyRent: 145000,
    securityDeposit: 145000,
    leaseTermMonths: 12,
    fees: [
      {
        label: "pet fee",
        amount: 3500,
        cadence: "monthly",
        category: "pet",
        refundable: false,
        excerpt: LEASE,
      },
    ],
    clauses: [],
    paymentMethods: [],
  },
  cost: {
    rent: 145000,
    recurringFees: 3500,
    amortizedOneTimeFees: 0,
    trueMonthlyCost: 148500,
    moveInCash: 290000,
    hiddenCostRatio: 3500 / 145000,
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
  ownership: { status: "match", claimedLandlord: "Buckeye Campus Properties LLC", record: null, detail: "Match." },
  flags: [],
  verdict: { tone: "clear", headline: "Clear", summary: "Clear." },
  questions: ["Can I pay by check?"],
} satisfies Analysis;

function replyModel(impl: LeaseReplyModel["complete"]): LeaseReplyModel & { complete: ReturnType<typeof vi.fn> } {
  return { complete: vi.fn(impl) };
}

describe("handleChatRequest", () => {
  it("returns key_missing and does not call the model", async () => {
    const model = replyModel(async () => {
      throw new Error("should not be called");
    });
    const result = await handleChatRequest(
      { question: "what is the real monthly cost?", analysis: { ...analysis, text: LEASE } },
      { hasApiKey: false, model },
    );
    expect(result).toEqual({ kind: "key_missing" });
    expect(model.complete).not.toHaveBeenCalled();
  });

  it("sends the brief, not the pasted lease, and keeps a fee amount that is in the analysis", async () => {
    const model = replyModel(async () => ({
      kind: "answer",
      topic: "fees",
      answer: "The pet fee is $35.",
      citations: ["fees"],
    }));
    const result = await handleChatRequest(
      { question: "what fees are there?", analysis: { ...analysis, text: LEASE } },
      { hasApiKey: true, model },
    );
    expect(result).toEqual({
      kind: "answer",
      topic: "fees",
      answer: "The pet fee is $35.",
      citations: ["fees"],
    });
    expect(JSON.stringify(model.complete.mock.calls)).not.toContain(LEASE);
    expect(JSON.stringify(model.complete.mock.calls)).toContain("3500");
  });

  it("turns a dollar amount the model invented into not_in_analysis", async () => {
    const model = replyModel(async () => ({
      kind: "answer",
      topic: "fees",
      answer: "There is a charge of $9,999.",
      citations: ["fees"],
    }));
    const result = await handleChatRequest({ question: "any other fees?", analysis }, { hasApiKey: true, model });
    expect(result).toEqual({ kind: "refusal", reason: "not_in_analysis" });
  });

  it("logs the status and error code when the model throws, and not the key or body", async () => {
    const secret = "sk-live-secret-should-not-be-logged";
    const error = {
      name: "APICallError",
      statusCode: 429,
      responseHeaders: { authorization: `Bearer ${secret}` },
      responseBody: JSON.stringify({
        error: { message: `bad key ${secret}`, code: "billing_not_active" },
      }),
      cause: { code: secret },
    };
    const line = chatErrorLine(error);
    expect(line).toBe("chat model error status=429 code=billing_not_active");
    expect(line).not.toContain(secret);
    expect(line).not.toContain("bad key");

    const model = replyModel(async () => {
      throw error;
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await handleChatRequest(
      { question: "What is the real monthly cost?", analysis },
      { hasApiKey: true, model },
    );
    expect(result).toEqual({ kind: "unavailable" });
    expect(spy).toHaveBeenCalledWith(line);
    spy.mockRestore();
  });

  it("rejects a body that is not a question about an analysis", async () => {
    const model = replyModel(async () => ({ kind: "refusal", reason: "off_topic" }));
    expect(await handleChatRequest({ question: "hi" }, { hasApiKey: true, model })).toEqual({ kind: "invalid" });
    expect(model.complete).not.toHaveBeenCalled();
  });
});

describe("questionFromChatBody", () => {
  it("reads the latest user text from a chat transcript", () => {
    const body = questionFromChatBody({
      analysis,
      messages: [
        { role: "user", parts: [{ type: "text", text: "What is the real monthly cost?" }] },
        { role: "assistant", parts: [{ type: "text", text: "later" }] },
      ],
    });
    expect(body?.question).toBe("What is the real monthly cost?");
    expect(body?.analysis).toBe(analysis);
  });
});

describe("handleRecommendRequest", () => {
  it("blocks the cheaper scam listing and describes only the winner", async () => {
    const scam: Analysis = {
      ...analysis,
      terms: { ...analysis.terms, monthlyRent: 40000, fees: [], paymentMethods: ["Zelle"] },
      cost: { ...analysis.cost, rent: 40000, recurringFees: 0, trueMonthlyCost: 40000, moveInCash: 80000 },
      ownership: { ...analysis.ownership, status: "mismatch" },
      flags: [{ code: "P2P_PAYMENT_REQUEST", severity: "danger", title: "Zelle", detail: "Scam pattern." }],
      verdict: { tone: "stop", headline: "Do not pay anything yet", summary: "Stop." },
    };
    const fair: Analysis = {
      ...analysis,
      terms: { ...analysis.terms, fees: [] },
      cost: { ...analysis.cost, recurringFees: 0, trueMonthlyCost: 145000 },
    };
    const model: WinnerSentenceModel & { describe: ReturnType<typeof vi.fn> } = {
      describe: vi.fn(async () => "The true monthly cost is $1,450."),
    };

    const result = await handleRecommendRequest(
      {
        items: [
          { id: "scam", analysis: scam },
          { id: "fair", analysis: fair },
        ],
      },
      { hasApiKey: true, model },
    );

    expect(result).toMatchObject({
      ranking: { winner: { id: "fair" } },
      sentence: { kind: "sentence", text: "The true monthly cost is $1,450." },
    });
    if (!("ranking" in result)) return;
    expect(result.ranking.blocked.map((item) => item.id)).toEqual(["scam"]);
    expect(model.describe).toHaveBeenCalledOnce();
    expect(JSON.stringify(model.describe.mock.calls)).not.toContain(LEASE);
  });
});
