import { OverviewPageBody } from "@/app/journey/AnalysisViews";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function OverviewPage() {
  return (
    <WorkspaceFrame active="new">
      <OverviewPageBody />
    </WorkspaceFrame>
  );
}
