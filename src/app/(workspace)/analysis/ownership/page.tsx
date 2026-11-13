import { OwnershipPageBody } from "@/app/journey/AnalysisViews";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function OwnershipPage() {
  return (
    <WorkspaceFrame active="new">
      <OwnershipPageBody />
    </WorkspaceFrame>
  );
}
