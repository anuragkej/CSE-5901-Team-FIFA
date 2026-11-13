import { describe, expect, it } from "vitest";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { MAX_TEXT_LENGTH, readAnalyzeForm } from "@/app/analyzeInput";
import { analysisBrief } from "./analysisBrief";
import { analyze } from "./analyze";
import { validateReply } from "./leaseReply";
import { rankAnalyses } from "./rank";

const ports = createPorts();
const doc = (id: string) => sampleDocuments.find((sample) => sample.id === id)!.text;
const enough = "The tenant keeps the apartment clean and returns the keys at the end of the term.";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("analyzer inputs that feed ranking and chat", () => {
  it("rejects empty text, whitespace, text over the cap, and bedrooms outside 0 to 6", () => {
    expect(readAnalyzeForm(form({ text: "" }))).toEqual({
      error: "Paste at least a few sentences of the lease or listing.",
    });
    expect(readAnalyzeForm(form({ text: " \n\t " }))).toEqual({
      error: "Paste at least a few sentences of the lease or listing.",
    });
    expect(readAnalyzeForm(form({ text: "y".repeat(MAX_TEXT_LENGTH + 1) }))).toEqual({
      error: "Paste at most 50,000 characters.",
    });
    for (const bedrooms of ["-1", "7", "99"]) {
      expect(readAnalyzeForm(form({ text: enough, bedrooms }))).toEqual({
        error: "Bedrooms must be a whole number from 0 to 6.",
      });
    }
  });

  it("does not throw on empty text, whitespace, no rent, a payment-app scam, or an owner mismatch", async () => {
    const empty = await analyze({ text: "" }, ports);
    const whitespace = await analyze({ text: " \n\t ", bedrooms: 9 }, ports);
    const noRent = await analyze({ text: enough, bedrooms: -1 }, ports);
    const scam = await analyze({ text: doc("suspicious-sublease"), bedrooms: 7 }, ports);
    const fair = await analyze({ text: doc("standard-lease") }, ports);

    expect(empty.terms.monthlyRent).toBeNull();
    expect(whitespace.cost).toBeNull();
    expect(noRent.verdict.tone).toBe("incomplete");
    expect(fair.terms.bedrooms).toBe(2);

    const ranking = rankAnalyses([
      { id: "empty", analysis: empty },
      { id: "blank", analysis: noRent },
      { id: "scam", analysis: scam },
      { id: "fair", analysis: fair },
    ]);
    expect(ranking.winner?.id).toBe("fair");
    expect(ranking.blocked.find((item) => item.id === "scam")?.reasons).toEqual(
      expect.arrayContaining(["stop_verdict", "payment_app", "owner_mismatch"]),
    );
    expect(ranking.blocked.find((item) => item.id === "empty")?.reasons).toContain("no_rent");

    const brief = analysisBrief(scam);
    expect(JSON.stringify(brief)).not.toContain(doc("suspicious-sublease"));
    expect(
      validateReply({ kind: "answer", topic: "verdict", answer: "Look at the flags before you pay.", citations: ["flags"] }, scam).kind,
    ).toBe("answer");
  });

  it("survives odd strings without throwing", async () => {
    const random = mulberry32(3);
    for (let index = 0; index < 24; index += 1) {
      const text = junk(random, 20 + Math.floor(random() * 400));
      const bedrooms = Math.floor(random() * 12) - 3;
      const analysis = await analyze({ text, bedrooms }, ports);
      expect(() => rankAnalyses([{ id: String(index), analysis }])).not.toThrow();
      expect(() => analysisBrief(analysis)).not.toThrow();
    }
  });
});

function junk(random: () => number, length: number): string {
  const alphabet = " $%\n\t.abc0123456789Zelle rent fee";
  let text = "";
  for (let index = 0; index < length; index += 1) text += alphabet[Math.floor(random() * alphabet.length)];
  return text;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
