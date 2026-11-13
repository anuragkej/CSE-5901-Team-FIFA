"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { money } from "@/app/format";
import type { Analysis } from "@/domain/types";
import { browserAnalysisStore, loadAnalysis } from "./analysisStore";

export function ReportPanel() {
  const [analysis, setAnalysis] = useState<Analysis | null | undefined>(undefined);

  if (analysis === undefined) {
    return (
      <Button type="button" onClick={() => setAnalysis(loadAnalysis(browserAnalysisStore()))}>
        Open the saved report
      </Button>
    );
  }

  if (analysis === null) {
    return (
      <p className="text-muted-foreground">
        No report is saved in this browser.{" "}
        <Link href="/analysis" className="text-primary">
          Run an analysis
        </Link>
        .
      </p>
    );
  }

  return (
    <section className="flex max-w-2xl flex-col gap-3 rounded-xl border border-border bg-white p-6">
      <p className="font-mono text-xs text-primary">{analysis.verdict.tone.toUpperCase()}</p>
      <h2 className="font-heading text-3xl">{analysis.verdict.headline}</h2>
      <p>{analysis.verdict.summary}</p>
      <p className="font-heading text-4xl">{money(analysis.cost?.trueMonthlyCost ?? null)}</p>
      <p className="text-sm text-muted-foreground">
        {analysis.terms.address ?? "Address not found"}. Market and county figures in this report are sample data.
      </p>
      <Button nativeButton={false} render={<Link href="/analysis/overview" />}>
        Open the full overview →
      </Button>
    </section>
  );
}
