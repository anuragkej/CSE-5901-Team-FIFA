import { AskPanel } from "@/app/journey/AskPanel";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";

export default function AskPage() {
  return (
    <WorkspaceFrame active="overview">
      <p className="font-mono text-xs tracking-wide text-primary">LEASE ASSISTANT</p>
      <h1 className="font-heading text-4xl leading-tight">Ask a question. Get the context.</h1>
      <p className="text-lg text-muted-foreground">
        Answers use the extracted analysis. A dollar amount that is not in it is dropped. This is not legal advice.
      </p>
      <AskPanel />
    </WorkspaceFrame>
  );
}
