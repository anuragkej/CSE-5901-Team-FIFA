import { MarketPageBody } from "@/app/journey/AnalysisViews";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function MarketPage() {
  return (
    <WorkspaceFrame active="new">
      <MarketPageBody />
    </WorkspaceFrame>
  );
}
