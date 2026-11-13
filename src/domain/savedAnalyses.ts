import type {
  Analysis,
  Cadence,
  ClauseTopic,
  CostBreakdown,
  ExtractedTerms,
  FeeCategory,
  Flag,
  MarketComparison,
  MarketVerdict,
  OwnershipCheck,
  OwnershipStatus,
  Severity,
  Verdict,
  VerdictTone,
} from "./types";

export type AnalysisStorage = "supabase" | "memory";

export interface SavedAnalysisRecord {
  id: string;
  userId: string;
  createdAt: string;
  analysis: Analysis;
}

export interface AnalysisStore {
  save(userId: string, analysis: Analysis): Promise<SavedAnalysisRecord>;
  list(userId: string): Promise<SavedAnalysisRecord[]>;
}

export type SaveAnalysisResult =
  | { kind: "saved"; id: string; createdAt: string; storage: AnalysisStorage }
  | { kind: "signed_out" }
  | { kind: "invalid" }
  | { kind: "unavailable" };

export type ListAnalysesResult =
  | { kind: "list"; records: SavedAnalysisRecord[]; storage: AnalysisStorage }
  | { kind: "signed_out" }
  | { kind: "unavailable" };

/** Copy the analysis fields we keep. A pasted lease on the object is not one of them. */
export function persistedAnalysis(analysis: Analysis): Analysis {
  return {
    terms: {
      address: analysis.terms.address,
      bedrooms: analysis.terms.bedrooms,
      landlordName: analysis.terms.landlordName,
      monthlyRent: analysis.terms.monthlyRent,
      securityDeposit: analysis.terms.securityDeposit,
      leaseTermMonths: analysis.terms.leaseTermMonths,
      fees: analysis.terms.fees.map((fee) => ({
        label: fee.label,
        amount: fee.amount,
        cadence: fee.cadence,
        category: fee.category,
        refundable: fee.refundable,
        excerpt: fee.excerpt,
      })),
      clauses: analysis.terms.clauses.map((clause) => ({ topic: clause.topic, excerpt: clause.excerpt })),
      paymentMethods: [...analysis.terms.paymentMethods],
    },
    cost: analysis.cost
      ? {
          rent: analysis.cost.rent,
          recurringFees: analysis.cost.recurringFees,
          amortizedOneTimeFees: analysis.cost.amortizedOneTimeFees,
          trueMonthlyCost: analysis.cost.trueMonthlyCost,
          moveInCash: analysis.cost.moveInCash,
          hiddenCostRatio: analysis.cost.hiddenCostRatio,
          termMonths: analysis.cost.termMonths,
        }
      : null,
    market: {
      fmr: analysis.market.fmr,
      fmrDeltaPct: analysis.market.fmrDeltaPct,
      compMedian: analysis.market.compMedian,
      compDeltaPct: analysis.market.compDeltaPct,
      comps: analysis.market.comps.map((comp) => ({
        id: comp.id,
        address: comp.address,
        neighborhood: comp.neighborhood,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        sqft: comp.sqft,
        rent: comp.rent,
        source: comp.source,
      })),
      verdict: analysis.market.verdict,
    },
    ownership: {
      status: analysis.ownership.status,
      claimedLandlord: analysis.ownership.claimedLandlord,
      record: analysis.ownership.record
        ? {
            parcelId: analysis.ownership.record.parcelId,
            siteAddress: analysis.ownership.record.siteAddress,
            ownerName: analysis.ownership.record.ownerName,
            ownerMailingAddress: analysis.ownership.record.ownerMailingAddress,
            lastTransferDate: analysis.ownership.record.lastTransferDate,
            source: analysis.ownership.record.source,
          }
        : null,
      detail: analysis.ownership.detail,
    },
    flags: analysis.flags.map((flag) => ({
      code: flag.code,
      severity: flag.severity,
      title: flag.title,
      detail: flag.detail,
      basis: flag.basis,
      excerpt: flag.excerpt,
    })),
    verdict: {
      tone: analysis.verdict.tone,
      headline: analysis.verdict.headline,
      summary: analysis.verdict.summary,
    },
    questions: [...analysis.questions],
  };
}

export function memoryAnalysisStore(): AnalysisStore {
  const rows = new Map<string, SavedAnalysisRecord[]>();
  return {
    async save(userId, analysis) {
      const record: SavedAnalysisRecord = {
        id: crypto.randomUUID(),
        userId,
        createdAt: new Date().toISOString(),
        analysis: persistedAnalysis(analysis),
      };
      rows.set(userId, [record, ...(rows.get(userId) ?? [])]);
      return { ...record, analysis: persistedAnalysis(record.analysis) };
    },
    async list(userId) {
      return (rows.get(userId) ?? []).map((record) => ({
        ...record,
        analysis: persistedAnalysis(record.analysis),
      }));
    },
  };
}

export function isAnalysis(value: unknown): value is Analysis {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isTerms(record.terms) &&
    isCost(record.cost) &&
    isMarket(record.market) &&
    isOwnership(record.ownership) &&
    isFlags(record.flags) &&
    isVerdict(record.verdict) &&
    isStringList(record.questions)
  );
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isTerms(value: unknown): value is ExtractedTerms {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isNullableString(record.address) &&
    isNullableNumber(record.bedrooms) &&
    isNullableString(record.landlordName) &&
    isNullableNumber(record.monthlyRent) &&
    isNullableNumber(record.securityDeposit) &&
    isNullableNumber(record.leaseTermMonths) &&
    Array.isArray(record.fees) &&
    record.fees.every(isFee) &&
    Array.isArray(record.clauses) &&
    record.clauses.every(isClause) &&
    isStringList(record.paymentMethods)
  );
}

function isFee(value: unknown): boolean {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isString(record.label) &&
    isFiniteNumber(record.amount) &&
    isCadence(record.cadence) &&
    isFeeCategory(record.category) &&
    typeof record.refundable === "boolean" &&
    isString(record.excerpt)
  );
}

function isClause(value: unknown): boolean {
  const record = objectRecord(value);
  if (!record) return false;
  return isClauseTopic(record.topic) && isString(record.excerpt);
}

function isCost(value: unknown): value is CostBreakdown | null {
  if (value === null) return true;
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isFiniteNumber(record.rent) &&
    isFiniteNumber(record.recurringFees) &&
    isFiniteNumber(record.amortizedOneTimeFees) &&
    isFiniteNumber(record.trueMonthlyCost) &&
    isFiniteNumber(record.moveInCash) &&
    isFiniteNumber(record.hiddenCostRatio) &&
    isFiniteNumber(record.termMonths)
  );
}

function isMarket(value: unknown): value is MarketComparison {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isNullableNumber(record.fmr) &&
    isNullableNumber(record.fmrDeltaPct) &&
    isNullableNumber(record.compMedian) &&
    isNullableNumber(record.compDeltaPct) &&
    Array.isArray(record.comps) &&
    record.comps.every(isComparable) &&
    isMarketVerdict(record.verdict)
  );
}

function isComparable(value: unknown): boolean {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isString(record.id) &&
    isString(record.address) &&
    isString(record.neighborhood) &&
    isFiniteNumber(record.bedrooms) &&
    isFiniteNumber(record.bathrooms) &&
    isNullableNumber(record.sqft) &&
    isFiniteNumber(record.rent) &&
    isString(record.source)
  );
}

function isOwnership(value: unknown): value is OwnershipCheck {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isOwnershipStatus(record.status) &&
    isNullableString(record.claimedLandlord) &&
    (record.record === null || isPropertyRecord(record.record)) &&
    isString(record.detail)
  );
}

function isPropertyRecord(value: unknown): boolean {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isString(record.parcelId) &&
    isString(record.siteAddress) &&
    isString(record.ownerName) &&
    isString(record.ownerMailingAddress) &&
    isString(record.lastTransferDate) &&
    isString(record.source)
  );
}

function isFlags(value: unknown): value is Flag[] {
  return Array.isArray(value) && value.every(isFlag);
}

function isFlag(value: unknown): value is Flag {
  const record = objectRecord(value);
  if (!record) return false;
  return (
    isString(record.code) &&
    isSeverity(record.severity) &&
    isString(record.title) &&
    isString(record.detail) &&
    (record.basis === undefined || isString(record.basis)) &&
    (record.excerpt === undefined || isString(record.excerpt))
  );
}

function isVerdict(value: unknown): value is Verdict {
  const record = objectRecord(value);
  if (!record) return false;
  return isVerdictTone(record.tone) && isString(record.headline) && isString(record.summary);
}

function isCadence(value: unknown): value is Cadence {
  switch (value) {
    case "monthly":
    case "annual":
    case "one_time":
      return true;
    default:
      return false;
  }
}

function isFeeCategory(value: unknown): value is FeeCategory {
  switch (value) {
    case "utility":
    case "parking":
    case "pet":
    case "admin":
    case "deposit":
    case "insurance":
    case "amenity":
    case "other":
      return true;
    default:
      return false;
  }
}

function isClauseTopic(value: unknown): value is ClauseTopic {
  switch (value) {
    case "attorney_fees":
    case "confession_of_judgment":
    case "landlord_liability_waiver":
    case "auto_renewal":
    case "payment_method":
    case "late_fee":
      return true;
    default:
      return false;
  }
}

function isMarketVerdict(value: unknown): value is MarketVerdict {
  switch (value) {
    case "below_market":
    case "at_market":
    case "above_market":
    case "unknown":
      return true;
    default:
      return false;
  }
}

function isOwnershipStatus(value: unknown): value is OwnershipStatus {
  switch (value) {
    case "match":
    case "mismatch":
    case "no_record":
    case "not_checked":
      return true;
    default:
      return false;
  }
}

function isSeverity(value: unknown): value is Severity {
  switch (value) {
    case "info":
    case "warning":
    case "danger":
      return true;
    default:
      return false;
  }
}

function isVerdictTone(value: unknown): value is VerdictTone {
  switch (value) {
    case "stop":
    case "caution":
    case "clear":
    case "incomplete":
      return true;
    default:
      return false;
  }
}
