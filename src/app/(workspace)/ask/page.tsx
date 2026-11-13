import { AskPanel } from "@/app/journey/AskPanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function AskPage() {
  return (
    <WorkspaceFrame active="overview">
      <p className="font-mono text-xs tracking-wide text-primary">LEASE ASSISTANT</p>
      <h1 className="font-heading text-4xl leading-tight">Ask a question. Get the context.</h1>
      <p className="text-lg text-muted-foreground">Answers use the terms and estimates in the analysis saved in this browser.</p>
      <AskPanel />
    </WorkspaceFrame>
  );
}
