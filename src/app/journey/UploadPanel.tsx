"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { Button } from "@/components/ui/button";
import { browserDraftStore, saveDraft } from "./draft";

export function UploadPanel() {
  const router = useRouter();
  const sample = sampleDocuments[0];
  const [note, setNote] = useState("Sample lease text is ready. PDF parsing is not wired.");

  function useSample() {
    saveDraft(browserDraftStore(), { text: sample.text });
    router.push(`/analyze/review?sample=${sample.id}`);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("text/") && !file.name.endsWith(".txt")) {
      setNote("This prototype reads .txt files and the Summit Street sample. PDF parsing is not wired.");
      return;
    }
    const text = await file.text();
    if (text.trim().length < 40) {
      setNote("That file is too short to review. Use the Summit Street sample.");
      return;
    }
    saveDraft(browserDraftStore(), { text });
    router.push("/analyze/review");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <Button type="button">Upload PDF</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/analyze/paste" />}>
          Paste lease / listing
        </Button>
      </div>
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-8">
        <p className="text-4xl text-primary" aria-hidden="true">
          ↑
        </p>
        <h2 className="font-heading text-3xl">Drop your lease here</h2>
        <p className="text-muted-foreground">PDF · Up to 10 MB · Text-based documents work best</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={useSample}>
            Choose sample PDF
          </Button>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-border bg-white px-4 text-sm font-medium">
            Choose a .txt file
            <input
              className="sr-only"
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="h-px bg-border" />
        <p className="font-mono text-xs text-primary">DEMO FILE</p>
        <p className="text-lg font-semibold">summit-street-lease.txt</p>
        <p className="text-success">{note}</p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={useSample}>
          Use sample & review details →
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Choosing the sample loads the Summit Street lease text already in the app. It does not upload a PDF.
      </p>
    </div>
  );
}
