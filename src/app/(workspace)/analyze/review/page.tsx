import { Suspense } from "react";
import { ReviewPanelLoader } from "@/app/journey/ReviewPanelLoader";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function ReviewPage() {
  return (
    <WorkspaceFrame active="new">
      <p className="font-mono text-xs tracking-wide text-primary">NEW ANALYSIS · STEP 2 OF 3</p>
      <h1 className="font-heading text-4xl leading-tight">Does this look right?</h1>
      <p className="text-lg text-muted-foreground">We found these details in your lease. Confirm or correct them before continuing.</p>
      <Suspense fallback={<p className="text-muted-foreground">Reading the lease…</p>}>
        <ReviewPanelLoader />
      </Suspense>
    </WorkspaceFrame>
  );
}
