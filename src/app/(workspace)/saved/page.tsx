import Link from "next/link";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { RecommendationList } from "@/app/RecommendationList";
import { listAnalysesAction } from "@/app/savedAnalysisActions";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";
import { money } from "@/app/format";
import { Button } from "@/components/ui/button";

export default async function SavedPage() {
  const listed = await listAnalysesAction();
  const records = listed.kind === "list" ? listed.records : [];

  return (
    <WorkspaceFrame active="saved">
      <p className="font-mono text-xs tracking-wide text-primary">LIBRARY</p>
      <h1 className="font-heading text-4xl leading-tight">Saved analyses</h1>
      {listed.kind === "signed_out" && (
        <p className="text-lg text-muted-foreground">
          <Link href="/login" className="text-primary">
            Log in
          </Link>{" "}
          to save an analysis to your account. Until then, the sample leases below stay in the app.
        </p>
      )}
      {listed.kind === "list" && listed.storage === "memory" && (
        <p className="text-muted-foreground">
          These rows are in this server&apos;s memory because the database write was not available. They last for this server process.
        </p>
      )}
      {listed.kind === "list" && records.length === 0 && (
        <p className="text-muted-foreground">Nothing is saved on your account yet. Run an analysis, then save it.</p>
      )}
      {listed.kind === "unavailable" && <p className="text-destructive">Could not load saved analyses just now.</p>}
      {records.length > 0 && (
        <ul className="flex flex-col gap-3">
          {records.map((record) => (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-5">
              <div>
                <p className="text-lg font-semibold">{record.analysis.terms.address ?? "Untitled analysis"}</p>
                <p className="text-sm text-muted-foreground">
                  {money(record.analysis.cost?.trueMonthlyCost ?? null)} true monthly · {record.analysis.verdict.headline}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {records.length >= 2 && (
        <RecommendationList items={records.map((record) => ({ id: record.id, analysis: record.analysis }))} />
      )}
      <h2 className="font-heading text-2xl">Sample leases</h2>
      <ul className="flex flex-col gap-3">
        {sampleDocuments.map((sample) => (
          <li key={sample.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-5">
            <div>
              <p className="text-lg font-semibold">{sample.title}</p>
              <p className="text-sm text-muted-foreground">Sample document</p>
            </div>
            <Button variant="outline" nativeButton={false} render={<Link href={`/analyze/review?sample=${sample.id}`} />}>
              Review details →
            </Button>
          </li>
        ))}
      </ul>
      <Button nativeButton={false} render={<Link href="/compare" />}>
        Compare these options →
      </Button>
    </WorkspaceFrame>
  );
}
