import Link from "next/link";
import { createPorts } from "@/adapters";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { RecommendationList } from "@/app/RecommendationList";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";
import { Button } from "@/components/ui/button";
import { analyze } from "@/domain/analyze";

export default async function ComparePage() {
  const ports = createPorts();
  const items = await Promise.all(
    sampleDocuments.map(async (sample) => ({
      id: sample.id,
      analysis: await analyze({ text: sample.text }, ports),
    })),
  );

  return (
    <WorkspaceFrame active="compare">
      <p className="font-mono text-xs tracking-wide text-primary">YOUR SHORTLIST · {items.length} SAMPLE OPTIONS</p>
      <h1 className="font-heading text-4xl leading-tight">Compare the whole picture.</h1>
      <p className="text-lg text-muted-foreground">
        Ranked by true monthly cost. A stop verdict, a payment-app flag, or an owner mismatch is not recommended. These
        are the sample leases, not live listings.
      </p>
      <RecommendationList
        items={items}
        links={Object.fromEntries(items.map((item) => [item.id, `/analyze/review?sample=${item.id}`]))}
        blockedLinks={Object.fromEntries(items.map((item) => [item.id, "/analysis/scam"]))}
      />
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
