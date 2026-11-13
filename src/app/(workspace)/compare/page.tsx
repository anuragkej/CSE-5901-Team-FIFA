import Link from "next/link";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { money } from "@/app/format";
import { rankOptions } from "@/app/journey/decisions";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { analyze } from "@/domain/analyze";

export default async function ComparePage() {
  const ports = createPorts();
  const ranked = rankOptions(
    await Promise.all(
      sampleDocuments.map(async (sample) => ({
        id: sample.id,
        title: sample.title,
        analysis: await analyze({ text: sample.text }, ports),
      })),
    ),
  );
  const recommended = ranked.find((option) => option.analysis.verdict.tone !== "stop");

  return (
    <WorkspaceFrame active="compare">
      <p className="font-mono text-xs tracking-wide text-primary">YOUR SHORTLIST · {ranked.length} SAMPLE OPTIONS</p>
      <h1 className="font-heading text-4xl leading-tight">Compare the whole picture.</h1>
      <p className="text-lg text-muted-foreground">
        Ranked by estimated true monthly cost. A stop verdict is not recommended. These are the sample leases, not live listings.
      </p>
      <Button variant="outline" nativeButton={false} render={<Link href="/analyze/upload" />}>
        Add an option
      </Button>
      <div className="grid gap-4 lg:grid-cols-3">
        {ranked.map((option) => {
          const blocked = option.analysis.verdict.tone === "stop";
          const recommendedThis = option.id === recommended?.id;
          return (
            <article
              key={option.id}
              className={blocked ? "flex flex-col gap-3 rounded-xl border border-border bg-rose p-6" : recommendedThis ? "flex flex-col gap-3 rounded-xl border border-border bg-success-tint p-6" : "flex flex-col gap-3 rounded-xl border border-border bg-white p-6"}
            >
              <p className="text-xs font-semibold tracking-wide text-primary">
                {blocked ? "EXCLUDED · HIGH RISK" : recommendedThis ? "LOWEST ELIGIBLE COST" : "ALTERNATIVE"}
              </p>
              <h2 className="font-heading text-2xl">{option.analysis.terms.address ?? option.title}</h2>
              <p className="text-muted-foreground">{option.analysis.terms.bedrooms ?? "—"} beds · sample</p>
              <p className="font-heading text-4xl">{money(option.analysis.cost?.trueMonthlyCost ?? null)}</p>
              <p className="text-sm text-muted-foreground">{option.analysis.verdict.headline}</p>
              <Button
                variant={recommendedThis ? "default" : "outline"}
                nativeButton={false}
                render={<Link href={blocked ? "/analysis/scam" : `/analyze/review?sample=${option.id}`} />}
              >
                {blocked ? "Review risk warnings" : "Open this sample"}
              </Button>
            </article>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/checklist" />}>
          Make my decision checklist →
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/saved" />}>
          Back to saved analyses
        </Button>
      </div>
    </WorkspaceFrame>
  );
}
