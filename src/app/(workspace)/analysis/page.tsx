import { AnalyzingPanel } from "@/app/journey/AnalyzingPanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function AnalyzingPage() {
  return (
    <WorkspaceFrame active="new">
      <p className="font-mono text-xs tracking-wide text-primary">NEW ANALYSIS · STEP 3 OF 3</p>
      <h1 className="font-heading text-4xl leading-tight">Reading the fine print.</h1>
      <p className="text-lg text-muted-foreground">This uses the lease text you confirmed and the sample market and county lookups.</p>
      <AnalyzingPanel />
    </WorkspaceFrame>
  );
}
