import { Diamond } from "lucide-react";

const STEPS = [
  ["01", "Understand every fee"],
  ["02", "Compare Columbus rents"],
  ["03", "Spot risks before paying"],
] as const;

export function AuthBrand() {
  return (
    <aside className="bg-primary text-primary-foreground lg:flex lg:w-[640px] lg:shrink-0 lg:flex-col lg:justify-between lg:px-16 lg:py-16">
      <div className="flex items-center gap-3 px-6 py-5 lg:px-0 lg:py-0">
        <Diamond aria-hidden="true" className="size-7" strokeWidth={1.5} />
        <p className="font-heading text-3xl leading-none">LeaseLens</p>
      </div>
      <div className="hidden flex-col gap-7 lg:flex">
        <h1 className="font-heading text-6xl leading-[1.12] font-normal">
          A clearer lease.
          <br />
          A smarter move.
        </h1>
        <p className="text-xl leading-snug">Know the real cost before you sign.</p>
        <div className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-background p-7 text-foreground">
          <p className="font-mono text-xs tracking-wide text-primary">FROM THE LISTING TO THE FINE PRINT</p>
          <p className="font-heading text-4xl">$1,450 → $1,607.50</p>
          <p className="text-sm text-muted-foreground">Advertised rent · Estimated true monthly cost</p>
          <div className="h-px bg-border" />
          <p className="text-lg">Fees, utilities, and one-time costs—finally in one place.</p>
        </div>
        <ol className="flex flex-col gap-1 text-lg">
          {STEPS.map(([number, label]) => (
            <li key={number}>
              <span className="font-mono text-sm">{number}</span> {label}
            </li>
          ))}
        </ol>
      </div>
      <p className="hidden font-mono text-xs tracking-wide lg:block">TEAM FIFA · CSE 5914</p>
    </aside>
  );
}
