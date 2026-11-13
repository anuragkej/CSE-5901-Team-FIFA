import { ChecklistPanel } from "@/app/journey/ChecklistPanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function ChecklistPage() {
  return (
    <WorkspaceFrame active="saved">
      <p className="font-mono text-xs tracking-wide text-primary">BEFORE YOU DECIDE</p>
      <h1 className="font-heading text-4xl leading-tight">Decision checklist</h1>
      <p className="text-lg text-muted-foreground">Check off the questions for the analysis saved in this browser.</p>
      <ChecklistPanel />
    </WorkspaceFrame>
  );
}
