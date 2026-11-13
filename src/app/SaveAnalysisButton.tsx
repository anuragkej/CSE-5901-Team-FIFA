"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { saveAnalysisAction } from "@/app/savedAnalysisActions";
import { persistedAnalysis, type SaveAnalysisResult } from "@/domain/savedAnalyses";
import type { Analysis } from "@/domain/types";

export function SaveAnalysisButton({ analysis }: { analysis: Analysis }) {
  const [result, setResult] = useState<SaveAnalysisResult | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      setResult(await saveAnalysisAction(persistedAnalysis(analysis)));
    } catch {
      setResult({ kind: "unavailable" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={() => void save()}>
        {pending ? "Saving" : "Save this analysis"}
      </Button>
      {result && <SaveNote result={result} />}
    </div>
  );
}

function SaveNote({ result }: { result: SaveAnalysisResult }) {
  switch (result.kind) {
    case "saved":
      return (
        <p className="text-sm text-muted-foreground">
          {result.storage === "supabase"
            ? "Saved to your account. Only you can see it."
            : "Saved in this server's memory for now. It lasts for this server process."}
        </p>
      );
    case "signed_out":
      return (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary">
            Log in
          </Link>{" "}
          to save this analysis to your account.
        </p>
      );
    case "invalid":
      return <p className="text-sm text-destructive">That analysis could not be saved.</p>;
    case "unavailable":
      return <p className="text-sm text-destructive">Could not save just now. Try again.</p>;
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
