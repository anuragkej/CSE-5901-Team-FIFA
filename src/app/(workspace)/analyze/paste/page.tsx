import { PastePanel } from "@/app/journey/PastePanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function PastePage() {
  return (
    <WorkspaceFrame active="new">
      <p className="font-mono text-xs tracking-wide text-primary">NEW ANALYSIS · STEP 1 OF 3</p>
      <h1 className="font-heading text-4xl leading-tight">A listing is a good place to start.</h1>
      <p className="text-lg text-muted-foreground">
        Paste a lease, sublease post, or apartment listing—even if you don’t have a PDF yet.
      </p>
      <PastePanel />
    </WorkspaceFrame>
  );
}
