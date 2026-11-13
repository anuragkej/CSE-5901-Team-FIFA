import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { AnalyzerForm } from "../AnalyzerForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-10 sm:px-6">
      <h1 className="text-base font-normal text-muted-foreground">
        Paste a lease or a listing. Get the true monthly cost, every fee, how it compares to nearby units, whether the
        landlord owns the place, and anything Ohio law says should not be in there.
      </h1>
      <AnalyzerForm samples={sampleDocuments} />
      <footer className="text-xs text-muted-foreground">
        Prototype on fixture data. Market comps are synthetic, FMR is HUD FY2026, parcel records are shaped like the
        Franklin County Auditor export. Not legal advice.
      </footer>
    </main>
  );
}
