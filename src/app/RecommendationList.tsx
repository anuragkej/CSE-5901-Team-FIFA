"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/app/format";
import { Button } from "@/components/ui/button";
import type { WinnerSentence } from "@/domain/askLease";
import { rankAnalyses, type BlockReason, type RankableAnalysis } from "@/domain/rank";

export function RecommendationList({
  items,
  links = {},
  blockedLinks = {},
}: {
  items: RankableAnalysis[];
  links?: Record<string, string>;
  blockedLinks?: Record<string, string>;
}) {
  const ranking = items.length >= 2 ? rankAnalyses(items) : null;
  const key = items
    .map((item) => `${item.id}:${item.analysis.cost?.trueMonthlyCost ?? "none"}:${item.analysis.verdict.tone}`)
    .join("|");
  const [sentenceKey, setSentenceKey] = useState(key);
  const [sentence, setSentence] = useState<WinnerSentence | null>(null);
  if (sentenceKey !== key) {
    setSentenceKey(key);
    setSentence(null);
  }

  useEffect(() => {
    if (items.length < 2 || !rankAnalyses(items).winner) return;
    let cancel = false;
    void fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then(async (response) => (await response.json()) as { sentence?: WinnerSentence })
      .then((body) => {
        if (!cancel && body.sentence) setSentence(body.sentence);
      })
      .catch(() => {
        if (!cancel) setSentence({ kind: "unavailable" });
      });
    return () => {
      cancel = true;
    };
  }, [items, key]);

  if (!ranking) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border border-border bg-tint p-6">
        <h2 className="font-heading text-2xl">Recommendation</h2>
        <p className="text-muted-foreground">
          Analyze one more lease and they will be ranked by true monthly cost. A stop verdict, a payment-app request, or an owner mismatch stays off the list.
        </p>
        <Link href="/compare" className="text-sm text-primary">
          Compare the sample leases →
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Recommendations">
      <div>
        <h2 className="font-heading text-2xl">Start with the lowest real cost</h2>
        <p className="text-muted-foreground">Ranked by true monthly cost. Blocked leases are listed separately.</p>
      </div>
      {ranking.winner && (
        <article className="flex flex-col gap-2 rounded-xl border border-border bg-success-tint p-6">
          <p className="font-mono text-xs text-primary">LOWEST ELIGIBLE COST</p>
          <h3 className="font-heading text-3xl">{ranking.winner.analysis.terms.address ?? "This lease"}</h3>
          <p className="font-heading text-4xl">{money(ranking.winner.analysis.cost?.trueMonthlyCost ?? null)}</p>
          <Sentence sentence={sentence} />
          <OpenLink href={links[ranking.winner.id] ?? null} label="Open this one" />
        </article>
      )}
      <ol className="flex flex-col gap-2">
        {ranking.eligible.map((item, index) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3">
            <span>
              {index + 1}. {item.analysis.terms.address ?? item.id}
            </span>
            <span className="font-mono text-sm">{money(item.analysis.cost?.trueMonthlyCost ?? null)}</span>
          </li>
        ))}
      </ol>
      {ranking.blocked.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-xl">Not recommended</h3>
          {ranking.blocked.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-rose p-4">
              <p className="font-semibold">{item.analysis.terms.address ?? item.id}</p>
              <p className="text-sm text-muted-foreground">{item.reasons.map(blockLabel).join(" · ")}</p>
              <WarningLink href={blockedLinks[item.id] ?? null} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OpenLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <Button variant="outline" nativeButton={false} render={<Link href={href} />}>
      {label}
    </Button>
  );
}

function WarningLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <Link href={href} className="text-sm text-primary">
      Review the warning →
    </Link>
  );
}

function Sentence({ sentence }: { sentence: WinnerSentence | null }) {
  if (!sentence) return <p className="text-sm text-muted-foreground">Checking a one-line note against the analysis…</p>;
  switch (sentence.kind) {
    case "sentence":
      return <p>{sentence.text}</p>;
    case "refusal":
      return <p className="text-sm text-muted-foreground">The note was dropped because it used a number that is not in the analysis.</p>;
    case "key_missing":
      return <p className="text-sm text-muted-foreground">The ranking does not need the assistant. A written note is unavailable without a key.</p>;
    case "none":
      return null;
    case "unavailable":
      return <p className="text-sm text-muted-foreground">A one-line note could not be written just now. The ranking still uses the costs and flags.</p>;
    default: {
      const unreachable: never = sentence;
      return unreachable;
    }
  }
}

function blockLabel(reason: BlockReason): string {
  switch (reason) {
    case "stop_verdict":
      return "Stop verdict";
    case "payment_app":
      return "Payment app";
    case "owner_mismatch":
      return "Owner mismatch";
    case "no_rent":
      return "No rent found";
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
}
