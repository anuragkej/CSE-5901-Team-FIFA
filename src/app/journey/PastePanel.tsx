"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { MIN_TEXT_LENGTH, readAnalyzeForm } from "@/app/analyzeInput";
import { Button } from "@/components/ui/button";
import { browserDraftStore, saveDraft } from "./draft";

export function PastePanel() {
  const router = useRouter();
  const [text, setText] = useState(sampleDocuments[0].text);
  const [error, setError] = useState<string | null>(null);
  const ready = text.trim().length >= MIN_TEXT_LENGTH;

  function fill(id: string) {
    const sample = sampleDocuments.find((item) => item.id === id);
    if (sample) setText(sample.text);
  }

  function review() {
    const data = new FormData();
    data.set("text", text);
    const parsed = readAnalyzeForm(data);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    saveDraft(browserDraftStore(), parsed.input);
    router.push("/analyze/review");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" nativeButton={false} render={<Link href="/analyze/upload" />}>
          Upload PDF
        </Button>
        <Button type="button">Paste lease / listing</Button>
      </div>
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-white p-6">
        <label htmlFor="listing-text" className="font-semibold">
          Lease or listing text
        </label>
        <textarea
          id="listing-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          className="w-full rounded-xl border border-border bg-background p-4 text-base"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => fill("standard-lease")}>
            Use campus lease sample
          </Button>
          <Button type="button" variant="outline" onClick={() => fill("suspicious-sublease")}>
            Try suspicious sublease
          </Button>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={review}>
          Review details →
        </Button>
        <p className={ready ? "text-success" : "text-muted-foreground"}>
          {ready ? "✓  Sample text meets the minimum length" : "Paste at least a few sentences of the lease or listing."}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
