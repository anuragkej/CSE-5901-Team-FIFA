"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/domain/types";
import { money, signedPercent } from "@/app/format";
import { LeaseChat } from "@/app/LeaseChat";
import { RecommendationList } from "@/app/RecommendationList";
import { SaveAnalysisButton } from "@/app/SaveAnalysisButton";
import { listAnalysesAction } from "@/app/savedAnalysisActions";
import type { RankableAnalysis } from "@/domain/rank";
import { browserAnalysisStore, dangerFlags, loadAnalysis } from "./analysisStore";

const LINKS = [
  ["/analysis/overview", "Overview"],
  ["/analysis/cost", "True cost"],
  ["/analysis/market", "Market"],
  ["/analysis/ownership", "Ownership"],
  ["/analysis/scam", "Scam warning"],
] as const;

export function AnalysisView({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: (analysis: Analysis) => ReactNode;
}) {
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

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mono text-xs tracking-wide text-primary">{kicker}</p>
      <h1 className="font-heading text-4xl leading-tight">{title}</h1>
      <nav aria-label="Analysis" className="flex flex-wrap gap-2">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md px-3 py-1 text-sm text-primary">
            {label}
          </Link>
        ))}
      </nav>
      {analysis === undefined && <p className="text-muted-foreground">Opening the analysis…</p>}
      {analysis === null && (
        <p className="text-muted-foreground">
          No analysis is saved in this browser yet.{" "}
          <Link href="/analysis" className="text-primary">
            Run one
          </Link>
          .
        </p>
      )}
      {analysis && children(analysis)}
    </div>
  );
}

export function OverviewBody({ analysis }: { analysis: Analysis }) {
  const cost = analysis.cost;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-white p-6">
        <p className="font-mono text-xs text-primary">{analysis.verdict.tone.toUpperCase()}</p>
        <h2 className="font-heading text-3xl">{analysis.verdict.headline}</h2>
        <p className="mt-2 text-muted-foreground">{analysis.verdict.summary}</p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <Fact label="TRUE MONTHLY COST" value={cost ? money(cost.trueMonthlyCost) : "—"} note={`Advertised rent ${money(analysis.terms.monthlyRent)}`} href="/analysis/cost" />
        <Fact label="COLUMBUS MARKET" value={analysis.market.verdict.replaceAll("_", " ")} note="Sample comps and HUD FY2026 FMR" href="/analysis/market" />
        <Fact label="OWNER ON RECORD" value={analysis.ownership.status.replaceAll("_", " ")} note={analysis.ownership.detail} href="/analysis/ownership" />
      </div>
      <Button nativeButton={false} render={<Link href="/analysis/scam" />}>
        {dangerFlags(analysis).length === 0 ? "No scam warning in this text" : "Read the scam warning →"}
      </Button>
      <SaveAnalysisButton analysis={analysis} />
      <SavedRecommendation analysis={analysis} />
      <LeaseChat analysis={analysis} />
    </div>
  );
}

function SavedRecommendation({ analysis }: { analysis: Analysis }) {
  const [items, setItems] = useState<RankableAnalysis[]>([{ id: "current", analysis }]);

  useEffect(() => {
    let cancel = false;
    void listAnalysesAction().then((result) => {
      if (cancel || result.kind !== "list") return;
      const saved = result.records.map((record) => ({ id: record.id, analysis: record.analysis }));
      setItems(uniqueAnalyses([{ id: "current", analysis }, ...saved]));
    });
    return () => {
      cancel = true;
    };
  }, [analysis]);

  return <RecommendationList items={items} />;
}

function uniqueAnalyses(items: RankableAnalysis[]): RankableAnalysis[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.analysis.terms.address ?? ""}:${item.analysis.cost?.trueMonthlyCost ?? "none"}:${item.analysis.verdict.tone}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function Fact({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-xl border border-border bg-white p-6">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-3xl capitalize">{value}</p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </Link>
  );
}

export function CostBody({ analysis }: { analysis: Analysis }) {
  const cost = analysis.cost;
  if (!cost) return <p>No monthly rent was found, so the true cost was not calculated.</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="font-heading text-5xl">{money(cost.trueMonthlyCost)}</p>
      <p className="text-muted-foreground">Estimated true monthly cost from the fees in the text. Deposits stay in move-in cash.</p>
      <dl className="grid max-w-lg grid-cols-2 gap-2 rounded-xl border border-border bg-white p-6">
        <Row label="Advertised rent" value={money(cost.rent)} />
        <Row label="Recurring fees" value={money(cost.recurringFees)} />
        <Row label="One-time fees, per month" value={money(cost.amortizedOneTimeFees)} />
        <Row label="Move-in cash" value={money(cost.moveInCash)} />
      </dl>
      <ul className="flex flex-col gap-2">
        {analysis.terms.fees.map((fee) => (
          <li key={`${fee.label}-${fee.amount}`} className="rounded-lg border border-border bg-white px-4 py-3">
            <span className="font-semibold">{fee.label}</span> · {money(fee.amount)} · {fee.cadence}
            {fee.refundable ? " · refundable" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketBody({ analysis }: { analysis: Analysis }) {
  const market = analysis.market;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        These comps and the fair-market rent are sample lookups, not a live RentCast or HUD call.{" "}
        {market.comps[0] ? `Source on the comps: ${market.comps[0].source}.` : "No comps were returned."}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-white p-6">
          <p className="font-mono text-xs text-muted-foreground">VERDICT</p>
          <p className="font-heading text-3xl capitalize">{market.verdict.replaceAll("_", " ")}</p>
        </article>
        <article className="rounded-xl border border-border bg-white p-6">
          <p className="font-mono text-xs text-muted-foreground">COMP MEDIAN</p>
          <p className="font-heading text-3xl">{money(market.compMedian)}</p>
          <p className="text-sm text-muted-foreground">{signedPercent(market.compDeltaPct)} vs advertised rent</p>
        </article>
        <article className="rounded-xl border border-border bg-white p-6">
          <p className="font-mono text-xs text-muted-foreground">FAIR MARKET RENT</p>
          <p className="font-heading text-3xl">{money(market.fmr)}</p>
          <p className="text-sm text-muted-foreground">{signedPercent(market.fmrDeltaPct)} vs advertised rent</p>
        </article>
      </div>
      <ul className="flex flex-col gap-2">
        {market.comps.map((comp) => (
          <li key={comp.id} className="rounded-lg border border-border bg-white px-4 py-3">
            {comp.address} · {comp.bedrooms} bed · {money(comp.rent)} · {comp.neighborhood}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OwnershipBody({ analysis }: { analysis: Analysis }) {
  const record = analysis.ownership.record;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-white p-6">
        <p className="font-mono text-xs text-primary">{analysis.ownership.status.replaceAll("_", " ")}</p>
        <p className="mt-2">{analysis.ownership.detail}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Claimed landlord: {analysis.ownership.claimedLandlord ?? "—"}. County records here are a sample shaped like the Franklin County Auditor export
          {record?.source ? ` (${record.source})` : ""}.
        </p>
      </section>
      {record && (
        <dl className="grid max-w-lg grid-cols-2 gap-2 rounded-xl border border-border bg-white p-6">
          <Row label="Owner on record" value={record.ownerName} />
          <Row label="Parcel" value={record.parcelId} />
          <Row label="Site" value={record.siteAddress} />
        </dl>
      )}
      <ul className="flex flex-col gap-2">
        {analysis.terms.clauses.map((clause) => (
          <li key={clause.topic} className="rounded-lg border border-border bg-white px-4 py-3">
            <span className="font-semibold">{clause.topic.replaceAll("_", " ")}</span>
            <p className="text-sm text-muted-foreground">{clause.excerpt}</p>
          </li>
        ))}
        {analysis.terms.clauses.length === 0 && <li className="text-muted-foreground">No watched clauses were found in the text.</li>}
      </ul>
    </div>
  );
}

export function ScamBody({ analysis }: { analysis: Analysis }) {
  const dangers = dangerFlags(analysis);
  if (dangers.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-success-tint p-6">
        <h2 className="font-heading text-3xl text-success">No scam warning in this text</h2>
        <p className="mt-2 text-muted-foreground">
          Nothing here asks for Zelle, Cash App, or another off-platform payment, and the landlord name is not flagged against the sample county record.
        </p>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-3xl">{analysis.verdict.headline}</h2>
      {dangers.map((flag) => (
        <article key={flag.code} className="rounded-xl border border-border bg-white p-6">
          <p className="font-mono text-xs text-primary">{flag.code}</p>
          <h3 className="text-lg font-semibold">{flag.title}</h3>
          <p className="text-muted-foreground">{flag.detail}</p>
          {flag.basis && <p className="mt-1 text-sm">{flag.basis}</p>}
        </article>
      ))}
    </div>
  );
}

export function OverviewPageBody() {
  return (
    <AnalysisView title="Here is the read." kicker="ANALYSIS">
      {(analysis) => <OverviewBody analysis={analysis} />}
    </AnalysisView>
  );
}

export function CostPageBody() {
  return (
    <AnalysisView title="What it actually costs." kicker="TRUE COST">
      {(analysis) => <CostBody analysis={analysis} />}
    </AnalysisView>
  );
}

export function MarketPageBody() {
  return (
    <AnalysisView title="How it sits in Columbus." kicker="MARKET">
      {(analysis) => <MarketBody analysis={analysis} />}
    </AnalysisView>
  );
}

export function OwnershipPageBody() {
  return (
    <AnalysisView title="Who owns it, and which clauses showed up." kicker="OWNERSHIP">
      {(analysis) => <OwnershipBody analysis={analysis} />}
    </AnalysisView>
  );
}

export function ScamPageBody() {
  return (
    <AnalysisView title="Would you send money first?" kicker="SCAM WARNING">
      {(analysis) => <ScamBody analysis={analysis} />}
    </AnalysisView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
