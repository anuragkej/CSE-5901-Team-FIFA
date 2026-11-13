import type { TermsExtractor } from "@/domain/ports";
import type {
  AnalysisInput,
  Cadence,
  Cents,
  Clause,
  ClauseTopic,
  ExtractedTerms,
  Fee,
  FeeCategory,
} from "@/domain/types";

const MONEY = /\$\s?([\d,]+(?:\.\d{1,2})?)/;

// A non-refundable "security deposit" is a fee; extractFees counts it, so it must not also count as the deposit.
const DEPOSIT = /(?<!non-?refundable\s)security\s+deposit[^$\n]{0,40}?\$\s?([\d,]+(?:\.\d{2})?)/i;
// Skips "2 months' rent" and "one month's rent", which size a deposit rather than the lease.
const TERM = /(\d{1,2})\s*-?\s*months?\b(?!'?s?'?\s+rent)/i;
const BEDROOMS = /(\d)\s*-?\s*(?:bed(?:room)?s?|br)\b/i;
const STUDIO = /\b(?:studios?|efficienc(?:y|ies))\b/i;
/** Under $100 is a bedroom count or a fee, not Columbus rent. */
const MIN_RENT_CENTS = 10_000;
const RENT_LABEL_SOURCE = "(?:monthly\\s+rent|rent\\s*(?:is|of|shall\\s+be|:))";
// Case-sensitive on purpose: "Landlord: Acme LLC" should match, "hold Landlord harmless" should not.
const LANDLORD = /\b(?:[Ll]andlord|LANDLORD|[Ll]essor|LESSOR|[Oo]wner|OWNER|[Mm]anaged\s+by)\s*[:\-]?\s*([A-Z][A-Za-z0-9&.' ]{2,60}?)(?=\s*(?:\(|,|\n|$|\.\s))/m;
const ADDRESS =
  /(\d{1,5}\s+(?:[NSEW]\.?\s+)?[A-Z0-9][A-Za-z0-9.\- ]*?\s(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place)\.?(?:,?\s*(?:Apt|Unit|#)\s*[\w-]+)?,?\s*Columbus,?\s*(?:OH|Ohio)\s*\d{5})/;

const P2P_METHODS = ["Zelle", "Venmo", "Cash App", "CashApp", "PayPal Friends", "wire transfer", "gift card", "Western Union", "MoneyGram", "cryptocurrency", "Bitcoin"];

const CLAUSE_PATTERNS: Array<[ClauseTopic, RegExp]> = [
  ["attorney_fees", /attorney'?s?\s+fees?/i],
  [
    "confession_of_judgment",
    /confess(?:ion(?:\s+of)?|\s+a)?\s+judgment|judgment\s+by\s+confession|warrant\s+of\s+attorney|cognovit/i,
  ],
  ["landlord_liability_waiver", /hold\s+(?:the\s+)?landlord\s+harmless|waives?\s+(?:any|all)\s+claims?\s+against\s+(?:the\s+)?landlord|landlord\s+(?:shall|is)\s+not\s+(?:be\s+)?liable\s+for\s+any|indemnify\s+(?:the\s+)?landlord/i],
  ["auto_renewal", /automatically\s+renew/i],
  [
    "late_fee",
    /late\s+(?:fee|charge)\b[^.\n]{0,80}?(?:\$\s?[\d,]+(?:\.\d{1,2})?|\d+(?:\.\d+)?\s*(?:%|percent\b))/i,
  ],
];

const FEE_CATEGORIES: Array<[FeeCategory, RegExp]> = [
  ["deposit", /deposit/i],
  ["amenity", /amenit|technology|package|gym|pool|valet/i],
  ["utility", /utilit|water|sewer|trash|gas|electric|internet|wifi|cable/i],
  ["parking", /parking|garage/i],
  ["pet", /\bpets?\b|animal/i],
  ["admin", /admin|application|processing|lease\s+(?:prep|signing)|move[- ]in\s+fee/i],
  ["insurance", /insurance|liability\s+waiver/i],
];

const ARTICLES = /^(?:a|an|the|one-time|optional|required|also|is|of|per\s+month|monthly|per\s+year|annual)\s+/i;

function toCents(raw: string): Cents {
  return Math.round(Number(raw.replace(/,/g, "")) * 100);
}

function firstMoney(text: string, pattern: RegExp): Cents | null {
  const match = text.match(pattern);
  return match ? toCents(match[1]) : null;
}

function centsIfRent(raw: string): Cents | null {
  const cents = toCents(raw);
  return cents >= MIN_RENT_CENTS ? cents : null;
}

function amountAfterRentLabel(window: string): Cents | null {
  for (const dollar of window.matchAll(/\$\s?([\d,]+(?:\.\d{1,2})?)/g)) {
    const cents = centsIfRent(dollar[1]);
    if (cents !== null) return cents;
  }
  for (const bare of window.matchAll(/\b([\d,]{3,}(?:\.\d{1,2})?)\b/g)) {
    if (/^(?:19|20)\d{2}$/.test(bare[1])) continue;
    const cents = centsIfRent(bare[1]);
    if (cents !== null) return cents;
  }
  return null;
}

/**
 * Rent is often written as "$1,200 a month" or "rent is 1450", with the dollar
 * sign missing or sitting on the other side of the word. Fee sentences are
 * skipped so a $45 utility line is not treated as the rent.
 */
function extractMonthlyRent(text: string): Cents | null {
  for (const match of text.matchAll(new RegExp(RENT_LABEL_SOURCE, "gi"))) {
    const start = (match.index ?? 0) + match[0].length;
    const found = amountAfterRentLabel(text.slice(start, start + 80));
    if (found !== null) return found;
  }

  const dollarThenRent = text.match(/\$\s?([\d,]+(?:\.\d{1,2})?)[^.\n]{0,40}?(?<!\bpet\s)\brents?\b/i);
  if (dollarThenRent) {
    const cents = centsIfRent(dollarThenRent[1]);
    if (cents !== null) return cents;
  }

  const rentThenDollar = text.match(/\brents?\b[^$\n]{0,80}?\$\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (rentThenDollar) {
    const cents = centsIfRent(rentThenDollar[1]);
    if (cents !== null) return cents;
  }

  for (const sentence of sentences(text)) {
    if (/\b(fee|fees|deposit|parking|pet|utilit|amenit|charge|insurance|application)\b/i.test(sentence)) continue;
    const monthly = sentence.match(/\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/\s*mo(?:nth)?|per\s+month|a\s+month|each\s+month)\b/i);
    if (!monthly) continue;
    const cents = centsIfRent(monthly[1]);
    if (cents !== null) return cents;
  }

  return null;
}

function extractBedrooms(text: string): number | null {
  const numbered = text.match(BEDROOMS);
  if (numbered) return Number(numbered[1]);
  if (STUDIO.test(text)) return 0;
  return null;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cadenceOf(sentence: string): Cadence {
  if (/per\s+month|monthly|\/\s?mo\b|each\s+month|a\s+month/i.test(sentence)) return "monthly";
  if (/annual|per\s+year|yearly|\/\s?yr\b/i.test(sentence)) return "annual";
  return "one_time";
}

function categoryOf(sentence: string): FeeCategory {
  for (const [category, pattern] of FEE_CATEGORIES) {
    if (pattern.test(sentence)) return category;
  }
  return "other";
}

function labelOf(fragment: string): string {
  const match = fragment.match(/((?:[A-Za-z/&'-]+\s+){1,3})(fee|charge|deposit|rent)\b/i);
  if (match) {
    let words = match[1].trim();
    while (ARTICLES.test(words)) words = words.replace(ARTICLES, "");
    return `${words} ${match[2].toLowerCase()}`;
  }
  return fragment.replace(MONEY, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

/** "Pet fee $300 one-time plus $35 per month pet rent" is two fees; split when a sentence prices more than one thing. */
function priceFragments(sentence: string): string[] {
  const amounts = sentence.match(new RegExp(MONEY.source, "g")) ?? [];
  if (amounts.length < 2) return [sentence];
  return sentence.split(/\s+(?:plus|and|\+|;)\s+/i).filter((f) => MONEY.test(f));
}

function extractFees(text: string): Fee[] {
  const fees: Fee[] = [];
  for (const sentence of sentences(text)) {
    if (!/\b(fee|charge|deposit)\b/i.test(sentence)) continue;
    if (/late\s+(?:fee|charge)/i.test(sentence)) continue;
    for (const fragment of priceFragments(sentence)) {
      if (/security\s+deposit/i.test(fragment) && !/non-?refundable/i.test(fragment)) continue;
      const money = fragment.match(MONEY);
      if (!money) continue;
      const category = categoryOf(fragment);
      fees.push({
        label: labelOf(fragment),
        amount: toCents(money[1]),
        cadence: cadenceOf(fragment),
        category,
        refundable: category === "deposit" && !/non-?refundable/i.test(fragment),
        excerpt: sentence,
      });
    }
  }
  return fees;
}

function extractClauses(text: string): Clause[] {
  const found: Clause[] = [];
  for (const sentence of sentences(text)) {
    for (const [topic, pattern] of CLAUSE_PATTERNS) {
      if (pattern.test(sentence) && !found.some((c) => c.topic === topic)) {
        found.push({ topic, excerpt: sentence });
      }
    }
    const method = P2P_METHODS.find((m) => new RegExp(m.replace(" ", "\\s*"), "i").test(sentence));
    if (method && !found.some((c) => c.topic === "payment_method")) {
      found.push({ topic: "payment_method", excerpt: sentence });
    }
  }
  return found;
}

function extractPaymentMethods(text: string): string[] {
  return P2P_METHODS.filter((m) => new RegExp(`\\b${m.replace(" ", "\\s*")}\\b`, "i").test(text));
}

/**
 * Deterministic extractor. It is the "rule engine, not only an LLM" layer from the
 * team's slides and doubles as the offline fallback once a Gemini adapter exists.
 */
export class RuleBasedExtractor implements TermsExtractor {
  async extract(input: AnalysisInput): Promise<ExtractedTerms> {
    const text = input.text;
    const term = text.match(TERM);
    const landlord = text.match(LANDLORD);
    const address = text.match(ADDRESS);
    return {
      address: address ? address[1].replace(/\s+/g, " ").trim() : null,
      bedrooms: extractBedrooms(text),
      landlordName: landlord ? landlord[1].trim() : null,
      monthlyRent: extractMonthlyRent(text),
      securityDeposit: firstMoney(text, DEPOSIT),
      leaseTermMonths: term ? Number(term[1]) : null,
      fees: extractFees(text),
      clauses: extractClauses(text),
      paymentMethods: extractPaymentMethods(text),
    };
  }
}
