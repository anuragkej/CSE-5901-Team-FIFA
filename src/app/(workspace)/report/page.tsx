import { ReportPanel } from "@/app/journey/ReportPanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function ReportPage() {
  return (
    <WorkspaceFrame active="saved">
      <p className="font-mono text-xs tracking-wide text-primary">REPORT</p>
      <h1 className="font-heading text-4xl leading-tight">Your report is ready.</h1>
      <p className="text-lg text-muted-foreground">It stays in this browser with the analysis you just ran.</p>
      <ReportPanel />
    </WorkspaceFrame>
  );
}
