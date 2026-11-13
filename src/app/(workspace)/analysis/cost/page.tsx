import { CostPageBody } from "@/app/journey/AnalysisViews";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function CostPage() {
  return (
    <WorkspaceFrame active="new">
      <CostPageBody />
    </WorkspaceFrame>
  );
}
