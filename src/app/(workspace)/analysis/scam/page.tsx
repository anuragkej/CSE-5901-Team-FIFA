import { ScamPageBody } from "@/app/journey/AnalysisViews";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function ScamPage() {
  return (
    <WorkspaceFrame active="new">
      <ScamPageBody />
    </WorkspaceFrame>
  );
}