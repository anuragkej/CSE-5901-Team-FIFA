import { describe, expect, it } from "vitest";
import { readAnalyzeForm } from "@/app/analyzeInput";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { RuleBasedExtractor } from "@/adapters/mock/ruleBasedExtractor";
import { loadDraft, saveDraft, type DraftStore } from "./draft";
import { greetingName, reviewFields } from "./reviewFields";

function memoryStore(): DraftStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: (key) => values.get(key) ?? null,
    set: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("reviewFields", () => {
  it("shows the Summit Street sample the way the extractor reads it", async () => {
    const terms = await new RuleBasedExtractor().extract({ text: sampleDocuments[0].text });
    expect(reviewFields(terms)).toEqual({
      address: "2115 Summit St, Apt 2, Columbus, OH 43201",
      bedrooms: "2",
      term: "12 months",
      landlord: "Buckeye Campus Properties LLC",
      rent: "$1,450",
      deposit: "$1,450",
    });
  });
});

describe("draft", () => {
  it("keeps the pasted text and the address a student confirms", () => {
    const store = memoryStore();
    const parsed = readAnalyzeForm(
      form({
        text: sampleDocuments[0].text,
        address: "2115 Summit St, Apt 2, Columbus, OH 43201",
        bedrooms: "2",
        landlordName: "Buckeye Campus Properties LLC",
      }),
    );
    if ("error" in parsed) throw new Error(parsed.error);
    saveDraft(store, parsed.input);

    expect(loadDraft(store)).toEqual({
      text: sampleDocuments[0].text,
      address: "2115 Summit St, Apt 2, Columbus, OH 43201",
      bedrooms: 2,
      landlordName: "Buckeye Campus Properties LLC",
    });
  });

  it("rejects a paste that is too short before anything is stored", () => {
    const store = memoryStore();
    expect(readAnalyzeForm(form({ text: "too short" }))).toEqual({
      error: "Paste at least a few sentences of the lease or listing.",
    });
    expect(loadDraft(store)).toBeNull();
  });
});

describe("greetingName", () => {
  it("uses the mailbox name when someone is signed in", () => {
    expect(greetingName("jose@osu.edu")).toBe("Jose");
    expect(greetingName(null)).toBe("there");
  });
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}
