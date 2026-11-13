import { describe, expect, it } from "vitest";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { analyze } from "@/domain/analyze";
import { costExplanation, nextQuestions, rankOptions } from "./decisions";

const ports = createPorts();

describe("decision screens", () => {
  it("explains the Summit Street true cost from the fees in the lease", async () => {
    const analysis = await analyze({ text: sampleDocuments[0].text }, ports);
    expect(costExplanation(analysis)).toBe(
      "Advertised rent is $1,450. Recurring fees add $95 and one-time fees add $12.50 per month, for a true monthly cost of $1,557.50. Fees in the text: administrative fee ($150, one_time); utility fee ($45, monthly); parking fee ($50, monthly).",
    );
    expect(nextQuestions(analysis)[0]).toBe(
      "Can you confirm $3,050 is everything due at move-in, including first month's rent, the deposit, and one-time fees?",
    );
  });

  it("ranks the sample leases by true cost and holds the scam listing out of the recommendation", async () => {
    const options = await Promise.all(
      sampleDocuments.map(async (sample) => ({
        id: sample.id,
        title: sample.title,
        analysis: await analyze({ text: sample.text }, ports),
      })),
    );
    const ranked = rankOptions(options);
    expect(ranked.map((option) => option.id)).toEqual(["standard-lease", "pasted-listing", "suspicious-sublease"]);
    expect(ranked[0].analysis.verdict.tone).not.toBe("stop");
    expect(ranked[2].analysis.verdict.headline).toBe("Do not pay anything yet");
    expect(ranked[0].analysis.cost?.trueMonthlyCost).toBe(155750);
  });
});
