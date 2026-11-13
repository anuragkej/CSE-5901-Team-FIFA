import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { CheckCircle2, Receipt } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle, alertVariants } from "@/components/ui/alert";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type {
  Analysis,
  ExtractedTerms,
  Flag,
  MarketComparison,
  MarketVerdict,
  OwnershipCheck,
  OwnershipStatus,
  Severity,
} from "@/domain/types";
import { CostCard } from "./CostCard";
import { cadenceLabel, MISSING, money, signedPercent } from "./format";
import { QuestionsCard } from "./QuestionsCard";
import { VerdictAlert } from "./VerdictAlert";

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const SEVERITIES: Record<Severity, { label: string; alert: AlertVariant; badge: BadgeVariant }> = {
  danger: { label: "Danger", alert: "destructive", badge: "destructive" },
  warning: { label: "Warning", alert: "warning", badge: "warning" },
  info: { label: "Info", alert: "info", badge: "info" },
};

const MARKET_VERDICTS: Record<MarketVerdict, { label: string; badge: BadgeVariant }> = {
  below_market: { label: "Below market", badge: "success" },
  at_market: { label: "At market", badge: "secondary" },
  above_market: { label: "Above market", badge: "warning" },
  unknown: { label: "Not enough data", badge: "outline" },
};

const OWNERSHIP_STATUSES: Record<OwnershipStatus, { label: string; badge: BadgeVariant }> = {
  match: { label: "Owner verified", badge: "success" },
  mismatch: { label: "Owner mismatch", badge: "destructive" },
  no_record: { label: "No county record", badge: "warning" },
  not_checked: { label: "Not checked", badge: "outline" },
};

function DefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-6 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FlagAlert({ flag }: { flag: Flag }) {
  const severity = SEVERITIES[flag.severity];
  return (
    <Alert variant={severity.alert}>
      <div className="flex items-center justify-between gap-2">
        <Badge variant={severity.badge}>{severity.label}</Badge>
        {flag.basis && <span className="text-xs text-muted-foreground">{flag.basis}</span>}
      </div>
      <AlertTitle>{flag.title}</AlertTitle>
      <AlertDescription>{flag.detail}</AlertDescription>
      {flag.excerpt && (
        <blockquote className="mt-1 border-l-2 pl-3 font-mono text-xs text-muted-foreground">{flag.excerpt}</blockquote>
      )}
    </Alert>
  );
}

function FlagsCard({ flags }: { flags: Flag[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flags</CardTitle>
        <CardAction>
          <Badge variant="secondary">{flags.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {flags.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle2 />
              </EmptyMedia>
              <EmptyTitle>Nothing unusual found in the text</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map((flag) => (
              <FlagAlert key={flag.code} flag={flag} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TermsSection({ terms }: { terms: ExtractedTerms }) {
  return (
    <div className="flex flex-col gap-4">
      <DefinitionList
        items={[
          { label: "Address", value: terms.address ?? MISSING },
          { label: "Bedrooms", value: terms.bedrooms ?? MISSING },
          { label: "Landlord", value: terms.landlordName ?? MISSING },
          { label: "Monthly rent", value: <span className="font-mono text-[13px]">{money(terms.monthlyRent)}</span> },
          { label: "Security deposit", value: <span className="font-mono text-[13px]">{money(terms.securityDeposit)}</span> },
          { label: "Term", value: terms.leaseTermMonths ? `${terms.leaseTermMonths} months` : MISSING },
        ]}
      />
      {terms.fees.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No fees beyond rent</EmptyTitle>
            <EmptyDescription>Nothing in the text charged on top of the monthly rent.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableBody>
            {terms.fees.map((fee, i) => (
              <TableRow key={`${fee.label}-${i}`}>
                <TableCell className="whitespace-normal">{fee.label}</TableCell>
                <TableCell className="text-right font-mono text-[13px] tabular-nums">{money(fee.amount)}</TableCell>
                <TableCell className="text-muted-foreground">{cadenceLabel[fee.cadence]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function MarketSection({ market }: { market: MarketComparison }) {
  const verdict = MARKET_VERDICTS[market.verdict];
  const benchmarks = [
    { label: "HUD Fair Market Rent", amount: market.fmr, delta: market.fmrDeltaPct },
    { label: "Median of comps", amount: market.compMedian, delta: market.compDeltaPct },
  ];
  return (
    <div className="flex flex-col gap-4">
      <DefinitionList
        items={benchmarks.map((b) => ({
          label: b.label,
          value: (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[13px]">{money(b.amount)}</span>
              <Badge variant={verdict.badge}>{signedPercent(b.delta)}</Badge>
            </span>
          ),
        }))}
      />
      {market.comps.length > 0 && (
        <Table>
          <TableBody>
            {market.comps.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-normal">
                  {c.address} <span className="text-muted-foreground">· {c.neighborhood}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.bedrooms}bd/{c.bathrooms}ba
                </TableCell>
                <TableCell className="text-right font-mono text-[13px] tabular-nums">{money(c.rent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function OwnershipSection({ ownership }: { ownership: OwnershipCheck }) {
  const status = OWNERSHIP_STATUSES[ownership.status];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.badge}>{status.label}</Badge>
        <span>{ownership.detail}</span>
      </div>
      {ownership.record && (
        <DefinitionList
          items={[
            { label: "Parcel", value: ownership.record.parcelId },
            { label: "Owner", value: ownership.record.ownerName },
            { label: "Last transfer", value: ownership.record.lastTransferDate },
          ]}
        />
      )}
    </div>
  );
}

export function Report({ analysis }: { analysis: Analysis }) {
  const { terms, cost, market, ownership, flags, verdict, questions } = analysis;
  return (
    <section className="flex flex-col gap-6" aria-live="polite">
      <VerdictAlert verdict={verdict} />
      <CostCard cost={cost} />
      <FlagsCard flags={flags} />
      <QuestionsCard questions={questions} />
      <Accordion multiple defaultValue={["terms"]}>
        <AccordionItem value="terms">
          <AccordionTrigger>What we read</AccordionTrigger>
          <AccordionContent>
            <TermsSection terms={terms} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="market">
          <AccordionTrigger>Market</AccordionTrigger>
          <AccordionContent>
            <MarketSection market={market} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="ownership">
          <AccordionTrigger>Ownership</AccordionTrigger>
          <AccordionContent>
            <OwnershipSection ownership={ownership} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
