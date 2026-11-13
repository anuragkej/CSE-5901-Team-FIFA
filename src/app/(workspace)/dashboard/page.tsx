import Link from "next/link";
import { requestAuth } from "@/adapters/supabase";
import { Button } from "@/components/ui/button";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";
import { greetingName } from "@/app/journey/reviewFields";

export default async function DashboardPage() {
  const session = await (await requestAuth()).session();
  const name = greetingName(session?.email ?? null);
  const sample = sampleDocuments[0];

  return (
    <WorkspaceFrame active="overview">
      <p className="font-mono text-xs tracking-wide text-primary">YOUR WORKSPACE</p>
      <h1 className="font-heading text-4xl leading-tight">Hi {name}. Find your fit.</h1>
      <p className="text-lg text-muted-foreground">A little clarity goes a long way when you’re moving off campus.</p>
      <section className="flex flex-col gap-4 rounded-xl bg-primary p-7 text-primary-foreground">
        <p className="font-mono text-xs tracking-wide">BEFORE YOU SIGN</p>
        <h2 className="font-heading text-3xl">Turn the fine print into a clear next step.</h2>
        <p className="max-w-3xl text-lg">
          Upload a lease or paste a listing. We’ll make the costs, terms, and risks easier to understand.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="bg-white text-foreground" nativeButton={false} render={<Link href="/analyze/upload" />}>
            Upload a lease →
          </Button>
          <Button variant="outline" className="bg-white text-foreground" nativeButton={false} render={<Link href="/analyze/paste" />}>
            Paste a listing
          </Button>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="SAVED ANALYSES" value={String(sampleDocuments.length)} note="Sample leases ready to open" />
        <Metric label="YOUR MONTHLY BUDGET" value="$1,700" note="Sample budget for the whole apartment" />
        <Metric label="PREFERRED AREA" value="Near OSU" note="Columbus · 1–2 bedrooms · sample" />
      </div>
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl">Pick up where you left off</h2>
          <Link href="/saved" className="text-primary">
            View all →
          </Link>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">2115 Summit St · Apt 2</p>
            <p className="text-muted-foreground">2 beds · 12 months · Sample lease</p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href={`/analyze/review?sample=${sample.id}`} />}>
            Open report →
          </Button>
        </div>
      </section>
    </WorkspaceFrame>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-border bg-white p-6">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-4xl">{value}</p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </article>
  );
}
