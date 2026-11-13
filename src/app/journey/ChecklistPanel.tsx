"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { browserAnalysisStore, loadAnalysis } from "./analysisStore";
import { nextQuestions } from "./decisions";

export function ChecklistPanel() {
  const [items, setItems] = useState<string[] | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function load() {
    const analysis = loadAnalysis(browserAnalysisStore());
    setItems(analysis ? nextQuestions(analysis) : []);
  }

  if (items === null) {
    return (
      <Button type="button" onClick={load}>
        Load questions from the saved analysis
      </Button>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground">
        No analysis is saved yet.{" "}
        <Link href="/analyze/upload" className="text-primary">
          Review the Summit Street sample
        </Link>
        .
      </p>
    );
  }

  const done = items.filter((item) => checked[item]).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        {done} of {items.length} checked. These are the questions the analyzer would send the landlord.
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item}>
            <label className="flex gap-3 rounded-xl border border-border bg-white p-4">
              <input
                type="checkbox"
                checked={checked[item] === true}
                onChange={(event) => setChecked((current) => ({ ...current, [item]: event.target.checked }))}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button nativeButton={false} render={<Link href="/report" />}>
        Report ready →
      </Button>
    </div>
  );
}
