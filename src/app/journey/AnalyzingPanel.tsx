"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { browserDraftStore, loadDraft } from "./draft";
import { analyzeDraftAction } from "./analyzeAction";
import { browserAnalysisStore, saveAnalysis } from "./analysisStore";

const STEPS = [
  "Reading the lease text",
  "Adding fees into a true monthly cost",
  "Comparing the rent with sample Columbus comps",
  "Checking the landlord against sample county records",
];

type Phase = "working" | "ready" | "missing" | "failed";

export function AnalyzingPanel() {
  const [phase, setPhase] = useState<Phase>("working");
  const [headline, setHeadline] = useState("");

  useEffect(() => {
    const draft = loadDraft(browserDraftStore());
    if (!draft) {
      queueMicrotask(() => setPhase("missing"));
      return;
    }
    let cancel = false;
    void analyzeDraftAction(draft)
      .then((analysis) => {
        if (cancel) return;
        saveAnalysis(browserAnalysisStore(), analysis);
        setHeadline(analysis.verdict.headline);
        setPhase("ready");
      })
      .catch(() => {
        if (!cancel) setPhase("failed");
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (phase === "missing") {
    return (
      <p className="text-muted-foreground">
        Nothing is waiting to be analyzed.{" "}
        <Link href="/analyze/paste" className="text-primary">
          Paste a listing
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-white p-6">
      <ol className="flex flex-col gap-2">
        {STEPS.map((step) => (
          <li key={step} className={phase === "ready" ? "text-success" : "text-foreground"}>
            {phase === "ready" ? "✓" : "·"} {step}
          </li>
        ))}
      </ol>
      {phase === "working" && <p className="text-muted-foreground">Working from the text you confirmed. Market and county figures are sample data.</p>}
      {phase === "ready" && (
        <>
          <p className="font-heading text-2xl">{headline}</p>
          <Button nativeButton={false} render={<Link href="/analysis/overview" />}>
            See the overview →
          </Button>
        </>
      )}
      {phase === "failed" && <p className="text-destructive">Could not analyze that document. Try again.</p>}
    </div>
  );
}
