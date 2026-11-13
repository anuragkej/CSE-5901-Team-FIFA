import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObject = vi.hoisted(() => vi.fn());
const createOpenAI = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateObject,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI,
}));

import { CHAT_MAX_OUTPUT_TOKENS, CHAT_TEMPERATURE } from "@/domain/chatModel";
import type { AnalysisBrief } from "@/domain/analysisBrief";
import {
  chatModelSelection,
  openAiLeaseReplyModel,
  restorePreferredChatModel,
} from "./openaiLeaseModel";

const brief: AnalysisBrief = {
  rentCents: 145000,
  fees: [],
  depositCents: 145000,
  trueMonthlyCostCents: 145000,
  moveInCashCents: 290000,
  landlord: "Buckeye Campus Properties LLC",
  address: "2115 Summit St",
  verdict: { tone: "clear", headline: "Clear", summary: "Clear." },
  flags: [],
  marketNote: "Market verdict: at market.",
  questions: [],
};

describe("openAiLeaseReplyModel", () => {
  beforeEach(() => {
    generateObject.mockReset();
    createOpenAI.mockReset();
    createOpenAI.mockImplementation(() => ({
      chat: (modelId: string) => ({ modelId }),
    }));
    restorePreferredChatModel();
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
  });

  it("calls generateObject with gpt-5-nano, temperature 0, and a 400 token cap", async () => {
    generateObject.mockResolvedValue({
      object: { kind: "answer", topic: "fees", answer: "Rent is $1,450.", citations: ["rent"] },
    });

    const result = await openAiLeaseReplyModel().complete({
      question: "what is the real monthly cost?",
      brief,
    });

    expect(result).toEqual({
      kind: "answer",
      topic: "fees",
      answer: "Rent is $1,450.",
      citations: ["rent"],
    });
    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "test-key-not-real" });
    expect(generateObject).toHaveBeenCalledOnce();
    const call = generateObject.mock.calls[0][0] as {
      temperature: number;
      maxOutputTokens: number;
      model: { modelId: string };
      prompt: string;
      system: string;
    };
    expect(call.temperature).toBe(CHAT_TEMPERATURE);
    expect(call.maxOutputTokens).toBe(CHAT_MAX_OUTPUT_TOKENS);
    expect(call.model.modelId).toBe("gpt-5-nano");
    expect(call.prompt).toContain("145000");
    expect(call.prompt).not.toContain("RAW_LEASE");
    expect(call.system).not.toContain("RAW_LEASE");
    expect(chatModelSelection()).toEqual({ id: "gpt-5-nano", fallbackNote: null });
  });

  it("switches to gpt-6-luna when the API rejects gpt-5-nano", async () => {
    generateObject
      .mockRejectedValueOnce(new Error("The model gpt-5-nano does not exist"))
      .mockResolvedValueOnce({ object: { kind: "refusal", reason: "off_topic" } });

    const result = await openAiLeaseReplyModel().complete({ question: "hello", brief });

    expect(result).toEqual({ kind: "refusal", reason: "off_topic" });
    const ids = generateObject.mock.calls.map((call) => (call[0] as { model: { modelId: string } }).model.modelId);
    expect(ids).toEqual(["gpt-5-nano", "gpt-6-luna"]);
    expect(chatModelSelection()).toEqual({ id: "gpt-6-luna", fallbackNote: "API rejected gpt-5-nano" });
  });

  it("does not switch models for an error that is not a model rejection", async () => {
    generateObject.mockRejectedValueOnce(new Error("network down"));
    await expect(openAiLeaseReplyModel().complete({ question: "hello", brief })).rejects.toThrow("network down");
    expect(chatModelSelection().id).toBe("gpt-5-nano");
    expect(generateObject).toHaveBeenCalledOnce();
  });
});
