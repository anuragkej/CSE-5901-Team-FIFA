import { UploadPanel } from "@/app/journey/UploadPanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function UploadPage() {
  return (
    <WorkspaceFrame active="new">
      <p className="font-mono text-xs tracking-wide text-primary">NEW ANALYSIS · STEP 1 OF 3</p>
      <h1 className="font-heading text-4xl leading-tight">Start with your lease.</h1>
      <p className="text-lg text-muted-foreground">We’ll pull out the costs and terms so you can review them before analysis.</p>
      <UploadPanel />
    </WorkspaceFrame>
  );
}
