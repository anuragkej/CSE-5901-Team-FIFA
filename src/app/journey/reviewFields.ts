import { money } from "@/app/format";
import type { ExtractedTerms } from "@/domain/types";

export interface ReviewFields {
  address: string;
  bedrooms: string;
  term: string;
  landlord: string;
  rent: string;
  deposit: string;
}

export function reviewFields(terms: ExtractedTerms): ReviewFields {
  return {
    address: terms.address ?? "",
    bedrooms: terms.bedrooms === null ? "" : String(terms.bedrooms),
    term: terms.leaseTermMonths === null ? "" : `${terms.leaseTermMonths} months`,
    landlord: terms.landlordName ?? "",
    rent: money(terms.monthlyRent),
    deposit: money(terms.securityDeposit),
  };
}

export function greetingName(email: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  if (!/^[A-Za-z]{2,40}$/.test(first)) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
