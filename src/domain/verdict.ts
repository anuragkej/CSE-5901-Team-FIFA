import type { CostBreakdown, Flag, Verdict, VerdictTone } from "./types";

const SCAM_CODES = new Set(["P2P_PAYMENT_REQUEST", "OWNERSHIP_MISMATCH"]);
const SUMMARY_FLAGS = 3;

const HEADLINES: Record<VerdictTone, string> = {
  stop: "Do not sign as written",
  caution: "Read these before you sign",
  clear: "Nothing alarming in this text",
  incomplete: "We need more of the document",
};

function toneFor(flags: Flag[], cost: CostBreakdown | null): VerdictTone {
  // A scam listing often omits the rent; a danger flag must not be hidden behind "incomplete".
  if (flags.some((f) => f.severity === "danger")) return "stop";
  if (cost === null) return "incomplete";
  if (flags.some((f) => f.severity === "warning")) return "caution";
  return "clear";
}

function summarize(flags: Flag[]): string {
  return flags
    .slice(0, SUMMARY_FLAGS)
    .map((f) => f.title.replace(/\.$/, ""))
    .join(". ")
    .concat(".");
}

/** Flags arrive sorted by severity, so the first few are the ones that matter. */
export function deriveVerdict(flags: Flag[], cost: CostBreakdown | null): Verdict {
  const tone = toneFor(flags, cost);
  switch (tone) {
    case "incomplete":
      return {
        tone,
        headline: HEADLINES.incomplete,
        summary: "No monthly rent was found, so cost and market checks were skipped. Paste the section that states the rent.",
      };
    case "stop":
      return {
        tone,
        headline: flags.some((f) => SCAM_CODES.has(f.code)) ? "Do not pay anything yet" : HEADLINES.stop,
        summary: summarize(flags.filter((f) => f.severity === "danger")),
      };
    case "caution":
      return { tone, headline: HEADLINES.caution, summary: summarize(flags) };
    case "clear":
      return {
        tone,
        headline: HEADLINES.clear,
        summary:
          flags.length === 0
            ? "No fee, clause, market, or ownership rule fired. Check the numbers below against the document yourself."
            : summarize(flags),
      };
    default: {
      const exhaustive: never = tone;
      return exhaustive;
    }
  }
}
