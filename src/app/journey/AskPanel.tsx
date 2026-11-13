"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LeaseChat } from "@/app/LeaseChat";
import type { Analysis } from "@/domain/types";
import { browserAnalysisStore, loadAnalysis } from "./analysisStore";

export function AskPanel() {
  const [analysis, setAnalysis] = useState<Analysis | null | undefined>(undefined);

  useEffect(() => {
    let cancel = false;
    void Promise.resolve().then(() => {
      if (!cancel) setAnalysis(loadAnalysis(browserAnalysisStore()));
    });
    return () => {
      cancel = true;
    };
  }, []);

  if (analysis === undefined) {
    return <p className="text-muted-foreground">Opening the analysis saved in this browser…</p>;
  }

  if (analysis === null) {
    return (
      <p className="text-muted-foreground">
        No analysis is saved in this browser.{" "}
        <Link href="/analyze/upload" className="text-primary">
          Start with the Summit Street sample
        </Link>
        .
      </p>
    );
  }

  return (
    <LeaseChat
      analysis={analysis}
      suggestions={[
        "What is the real monthly cost?",
        "What fees are included?",
        "Does the owner match?",
        "Is this a fair price?",
        "What should I ask next?",
      ]}
    />
  );
}
