import { SearchX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { CostBreakdown } from "@/domain/types";
import { money, percent } from "./format";

function segments(cost: CostBreakdown) {
  return [
    { label: "Rent", amount: cost.rent, className: "bg-primary" },
    { label: "Recurring fees", amount: cost.recurringFees, className: "bg-warning" },
    { label: "One-time fees, spread over the term", amount: cost.amortizedOneTimeFees, className: "bg-warning/60" },
  ].filter((s) => s.amount > 0);
}

function Figure({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          emphasized ? "text-[1.75rem] leading-[2.125rem] font-medium" : "text-lg font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Breakdown({ cost }: { cost: CostBreakdown }) {
  const parts = segments(cost);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 w-full gap-px overflow-hidden rounded-full bg-muted" aria-hidden>
        {parts.map((s) => (
          <div key={s.label} className={s.className} style={{ flexGrow: s.amount }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", s.className)} />
            {s.label} {money(s.amount)}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-4">
        <Figure label="Advertised rent" value={money(cost.rent)} />
        <Figure label="True monthly cost" value={money(cost.trueMonthlyCost)} emphasized />
        <Figure label="Cash due at move-in" value={money(cost.moveInCash)} />
      </div>
      <p className="text-sm text-muted-foreground">
        Fees add {percent(cost.hiddenCostRatio)} on top of rent over a {cost.termMonths}-month term.
      </p>
    </div>
  );
}

export function CostCard({ cost }: { cost: CostBreakdown | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What it really costs</CardTitle>
        <CardDescription>Advertised rent plus every recurring fee, with one-time fees spread across the term.</CardDescription>
      </CardHeader>
      <CardContent>
        {cost === null ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>No rent found</EmptyTitle>
              <EmptyDescription>Cost and market checks were skipped. Paste the section of the lease that states the rent.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Breakdown cost={cost} />
        )}
      </CardContent>
    </Card>
  );
}
