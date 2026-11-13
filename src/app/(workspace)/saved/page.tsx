import Link from "next/link";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";
import { Button } from "@/components/ui/button";

export default function SavedPage() {
  return (
    <WorkspaceFrame active="saved">
      <p className="font-mono text-xs tracking-wide text-primary">LIBRARY</p>
      <h1 className="font-heading text-4xl leading-tight">Saved analyses</h1>
      <p className="text-lg text-muted-foreground">
        These three sample leases live in the app. An analysis you run in this browser stays on this device, not in a new database table.
      </p>
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
