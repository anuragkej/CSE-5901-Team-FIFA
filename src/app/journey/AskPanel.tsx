"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/domain/types";
import { costExplanation, marketExplanation, nextQuestions, ownerExplanation } from "./decisions";
import { browserAnalysisStore, loadAnalysis } from "./analysisStore";

const PROMPTS = [
  { label: "Why is the real monthly cost higher?", kind: "cost" },
  { label: "What fees are included?", kind: "fees" },
  { label: "Does the owner match?", kind: "owner" },
  { label: "Is this a fair price?", kind: "market" },
  { label: "What should I ask next?", kind: "next" },
] as const;

type Kind = (typeof PROMPTS)[number]["kind"];

function answerFor(kind: Kind, analysis: Analysis): string {
  switch (kind) {
    case "cost":
    case "fees":
      return costExplanation(analysis);
    case "owner":
      return ownerExplanation(analysis);
    case "market":
      return marketExplanation(analysis);
    case "next":
      return nextQuestions(analysis).join(" ");
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

export function AskPanel() {
  const [analysis, setAnalysis] = useState<Analysis | null | undefined>(undefined);
  const [kind, setKind] = useState<Kind | null>(null);

  function choose(next: Kind) {
    const current = analysis ?? loadAnalysis(browserAnalysisStore());
    setAnalysis(current);
    setKind(next);
  }

  const loaded = analysis !== undefined;
  const current = kind && analysis ? { kind, text: answerFor(kind, analysis) } : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_18rem]">
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
        {!loaded && <p className="text-muted-foreground">Choose a question. The answer comes from the analysis saved in this browser.</p>}
        {loaded && analysis === null && (
          <p className="text-muted-foreground">
            No analysis is saved in this browser.{" "}
            <Link href="/analyze/upload" className="text-primary">
              Start with the Summit Street sample
            </Link>
            .
          </p>
        )}
        {current && (
          <>
            <div className="rounded-xl bg-rose p-4">
              <p className="font-mono text-[11px] text-primary">YOU</p>
              <p className="text-lg">{PROMPTS.find((prompt) => prompt.kind === current.kind)?.label}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] text-primary">LEASELENS</p>
              <p className="mt-2 text-lg">{current.text}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                This answer is calculated from the saved analysis. It is not a separate chatbot, and it is not legal advice.
              </p>
            </div>
          </>
        )}
      </section>
      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-tint p-6">
        <h2 className="font-heading text-2xl">Explore your lease</h2>
        {PROMPTS.map((prompt) => (
          <Button key={prompt.kind} type="button" variant="outline" className="h-auto whitespace-normal bg-white" onClick={() => choose(prompt.kind)}>
            {prompt.label}
          </Button>
        ))}
        <Link href="/analysis/cost" className="text-sm text-primary">
          Show me those costs →
        </Link>
      </aside>
    </div>
  );
}
